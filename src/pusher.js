import Pusher from 'pusher-js';
import { Subject } from 'rx';

const pusher = new Pusher('9a931b4a9a49a273aa42', {});

function pusherObservable(channelName, eventName) {
  const pusherMessages$ = new Subject();
  const channel = pusher.subscribe(channelName);
  channel.bind(eventName, (data) => {
    pusherMessages$.onNext(data);
  });

  return pusherMessages$.startWith(null);
}

export { pusherObservable };
