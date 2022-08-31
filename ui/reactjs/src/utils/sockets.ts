import { io } from "socket.io-client";
import getCookie from "./getCookie.ts";

interface socketsType {
  pong: any;
  chat: any;
}

const socketOptions: any = {
  transportOptions: {
    polling: {
      extraHeaders: {
        Authorization: `Bearer ${getCookie("pongJwtRefreshToken")}`,
      },
    },
  },
  autoConnect: false,
};
export const sockets: socketsType = {
  pong: io(`${process.env.REACT_APP_API_URL}:3003`, socketOptions),
  chat: io(`${process.env.REACT_APP_API_URL}:3002`, socketOptions),
};
export let pongSocketID: string = "";
export let chatSocketID: string = "";
sockets.pong.on("connect", () => {
  pongSocketID = sockets.pong.id;
});
sockets.chat.on("connect", () => {
  chatSocketID = sockets.chat.id;
});

sockets.chat.on("disconnect", () => {
  //console.log('bye!'); // undefined
});
sockets.pong.on("disconnect", () => {
  //console.log('bye!'); // undefined
});

sockets.chat.on("connect_error", () => {
  //console.log('bye sockets!');
});
sockets.pong.on("connect_error", () => {
  //console.log('bye sockets!');
});
