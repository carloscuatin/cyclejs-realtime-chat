
import Cycle from '@cycle/core';
import { span, p, div, form, button, input, img, makeDOMDriver } from '@cycle/dom';
import { Subject, Observable } from 'rx';
import { pusherObservable } from './pusher';
import { makeHTTPDriver } from '@cycle/http';


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



  const state$ = Observable.combineLatest(
    allPusherMessages$,
    (pusherMessages) => ({ pusherMessages })
  );

  const inputValue$ = sources.DOM
    .select('.input-message')
    .events('change')
    .startWith({ target: '' })
    .map(e => e.target.value)

  const messageSubmits$ = sources.DOM
    .select('.messages-form')
    .events('submit');


  const request$ = Observable.combineLatest(
    messageSubmits$,
    inputValue$,
    (submit, inputVal) => inputVal
  ).filter(
    (inputValue) => inputValue !== ''
  ).map((inputValue) => {
    return {
      method: 'POST',
      url: 'http://localhost:4567/messages',
      headers: {
        'Content-Type': 'application/json'
      },
      send: {
        time: new Date(),
        text: inputValue,
        username: 'pusher'
      }
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

  function view(state$) {
    return state$.map(({ pusherMessages }) => {
      return phoneOverlay(
        div({ className: 'light-grey-blue-background chat-app' }, [
          div({ className: 'message-list' }, [
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
                  // span({ className: 'timestamp' }, strftime('%H:%M:%S %P', new Date(time))),
                  span({ className: 'timestamp' }, 'date here'),
                  span({ className: 'seen' }),
                ]),
                p({ className: 'message-body' }, text)
              ])
            ])
          }))),
          div({ className: 'action-bar' }, [
            form({ className: 'messages-form', onsubmit: (e) => e.preventDefault() }, [
              input({ className: 'input-message col-xs-10', attributes: { placeholder: 'Your message' } }),
              div({ className: 'option col-xs-1 green-background send-message' }, [
                span({ className: 'white light fa fa-paper-plane-o' })
              ])
            ])
          ])
        ])
      )
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

