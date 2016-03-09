import Cycle from '@cycle/core';
import { span, p, div, form, button, input, img, makeDOMDriver } from '@cycle/dom';
import { Subject, Observable } from 'rx';
import { pusherObservable } from './pusher';
import { makeHTTPDriver } from '@cycle/http';
import strftime from 'strftime';


function main(sources) {

  const pusherMessages$ = pusherObservable('messages', 'new_message');

  const allPusherMessages$ = pusherMessages$.scan((acc, newData) => {
    if (newData) {
      return acc.concat([newData]);
    } else {
      return acc;
    }
  }, [{
    text: 'Hi there!',
    username: 'pusher',
    time: new Date()
  }, {
    text: 'How is it going?',
    username: 'pusher',
    time: new Date()
  }]);

  const intent = DOM => {
    const changeMessage$ = sources.DOM
      .select('.input-message')
      .events('input')
      .map(e => e.target.value)
      .share();

    return {
      submitUsername$: sources.DOM
        .select('.swish-input')
        .events('input')
        .sample(sources.DOM.select('.username-form').events('submit'))
        .map(e => e.target.value)
        .do(x => console.log('submitUsername', x))
        .share(),
      changeMessage$: changeMessage$.do(x => console.log('changeMessage', x)).share(),
      submitMessage$: changeMessage$
        .sample(sources.DOM.select('.messages-form').events('submit'))
        .do(x => console.log('submitMessage', x))
        .share()
    }
  };

  const actions = intent(sources.DOM);

  const model = actions => {
    const message$ = Rx.Observable.merge(
      actions.changeMessage$,
      actions.submitMessage$.map(x => '')
    ).startWith('')

    return Observable.combineLatest(
      allPusherMessages$.do(x => console.log('allPusherMessages', x)),
      actions.submitUsername$.startWith(''),
      message$,
      (pusherMessages, username, message) => ({ pusherMessages, username, message })
    );
  };

  const state$ = model(actions);

  const request$ = Rx.Observable.combineLatest(
    actions.submitMessage$,
    actions.submitUsername$,
    (message, username) => ({ message, username })
  ).filter(
    ({ message }) => message !== ''
  ).map(({ message, username }) => {
    console.log('running', message);
    return {
      method: 'POST',
      url: 'http://localhost:4567/messages',
      headers: {
        'Content-Type': 'application/json'
      },
      send: {
        time: new Date(),
        text: message,
        username
      }
    }
  });

  // TODO: Move to driver
  sources.DOM.select(':root').observable.subscribe(() => {
    const messageList = document.querySelector('#message-list');
    if (messageList) {
      messageList.scrollTop = messageList.offsetHeight;
    }
  });


  function phoneOverlay(body) {
    return div({ className: 'marvel-device iphone6 silver' }, [
      div({ className: 'top-bar' }),
      div({ className: 'sleep' }),
      div({ className: 'volume' }),
      div({ className: 'camera' }),
      div({ className: 'sensor' }),
      div({ className: 'speaker' }),
      div({ className: 'screen' }, body),
      div({ className: 'home' }),
      div({ className: 'bottom-bar' })
    ]);
  }

  function viewMessages(pusherMessages, message) {
    return phoneOverlay(
      div({ className: 'light-grey-blue-background chat-app' }, [
        div({ id: 'message-list' }, [
          div({ className: 'time-divide', attributes: { style: "margin-top: 15px" } }, [
            span({ className: 'date' }, 'Today' )
          ])
        ].concat(pusherMessages.map(({ text, username, time }) => {
          return div({ className: 'message' }, [
            div({ className: 'avatar' }, [
              img({ attributes: { src: `https://twitter.com/${username}/profile_image?size=original` } })
            ]),
            div({ className: 'text-display' }, [
              div({ className: 'message-data' }, [
                span({ className: 'author' }, username),
                span({ className: 'timestamp' }, strftime('%H:%M:%S %P', new Date(time))),
                span({ className: 'seen' }),
              ]),
              p({ className: 'message-body' }, text)
            ])
          ])
        }))),
        div({ className: 'action-bar' }, [
          form({ className: 'messages-form', onsubmit: (e) => e.preventDefault() }, [
            input({ className: 'input-message col-xs-10', value: message, attributes: { placeholder: 'Your message' } }),
            button({ className: 'option col-xs-1 green-background send-message' }, [
              span({ className: 'white light fa fa-paper-plane-o' })
            ])
          ])
        ])
      ])
    )
  }

  function viewUserinput() {
    return div([
      p({ className: 'light white' }, 'Enter your Twitter name and start chatting!'),
      div({ attributes: { style: 'margin-top: 20px' } }, [
        form({ className: 'username-form', onsubmit: (e) => e.preventDefault() }, [
          input({ id: 'input-name', attributes: { placeholder: 'Enter your Twitter name!', type: 'text' }, className: 'swish-input' }),
          button({ attributes: { type: 'submit' }, className: 'bright-blue-hover btn-white', id: 'try-it-out' }, 'Start chat')
        ])
      ])
    ])
  }

  function view(state$) {
    return state$.map(({ pusherMessages, username, message }) => {
      if (username) {
        return viewMessages(pusherMessages, message);
      } else {
        return viewUserinput();
      }
    })
  }

  return {
    DOM: view(state$),
    HTTP: request$
  }
}

const drivers = {
  DOM: makeDOMDriver('#app'),
  // we don't listen to the response, so we need to tell it to make HTTP requests anyway
  HTTP: makeHTTPDriver({ eager: true })
};

Cycle.run(main, drivers);

