import { useEffect, useRef, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import Toast from "react-bootstrap/Toast";
import React from "react";

interface Message {
  user: string;
  message: string;
  gameId: string;
}

function ChatWindow(props): React.FC {
  let navigate: any = useNavigate();
  const [msgState, setMsgState] = useState<Message[]>([]);
  const { setAuthenticated, sockets } = useOutletContext();
  const socket: any = sockets.chat;
  const pongSocket: any = sockets.pong;

  useEffect(
    function () {
      pongSocket.on("chat-redirect", (message: string) => {
        // Navigate to pong
        if (message === "OK") navigate("/play");
        else {
          //console.log("Failed to redirect");
        }
      });
      return () => {
        pongSocket.off("chat-redirect");
      };
    },
    [props.user]
  );

  useEffect(
    function () {
      if (props.user != "") {
        socket.on("join-room-client", (messages, currentRoomId) => {
          setMsgState(messages);
        });
      }
      return () => {
        if (props.user != "") {
          socket.off("join-room-client");
        }
      };
    },
    [props.user]
  );

  useEffect(
    function () {
      if (props.user != "") {
        socket.on("req-last-message", (roomid) => {
          socket.emit(
            "get-last-message",
            { roomid: roomid, user: props.user },
            (msg) => {
              setMsgState((array) => [...array, msg]);
            }
          );
        });
      }
      return () => {
        if (props.user != "") {
          socket.off("req-last-message");
        }
      };
    },
    [props.user]
  );

  function handleSubmit(e) {
    e.preventDefault();
    const { msg } = e.target.elements;
    if (msg.value != "")
      socket.emit("send-message", { message: msg.value, user: props.user });
    msg.value = "";
  }

  const bottomRef = useRef(null);
  useEffect(
    function () {
      bottomRef.current.scrollIntoView({ block: "end", inline: "nearest" });
    },
    [msgState]
  );

  return (
    <>
      <div style={{ position: "relative" }}>
        <div className="pop-up">
          <PopUpToast></PopUpToast>
        </div>
        <div className="chatbox-wrapper">
          <div className="room-header">{props.currentRoomId}</div>
          <div className="chatbox">
            <ul className="message-block">
              {msgState.map((item, i) => (
                <Message
                  message={item.message}
                  user={item.user}
                  gameId={item.gameId}
                  id={i}
                  currentUser={props.user}
                  key={i}
                />
              ))}
              {/* {msgState.map((item, i) => (
							<Message message={item.message} user={item.user} gameId={"hey"} id={i} currentUser={props.user} key={i}/>
						))} */}

              <div ref={bottomRef}></div>
            </ul>
          </div>
          <form className="chat-input" action="" onSubmit={handleSubmit}>
            <input
              type="text"
              className="message-input"
              id="msg"
              autoComplete="off"
              autoCapitalize="on"
            />
            <input type="submit" className="submit-button" value="->" />
          </form>
        </div>
      </div>
    </>
  );
}

function Message(props) {
  let joinGame = <></>;

  function handleJoin() {
    console.log("Joining game");
    // Pong game entry point
  }

  if (props.gameId !== "")
    joinGame = <button onClick={handleJoin}>Join Game</button>;
  if (props.user === props.currentUser) {
    return (
      <ul className="message-block" style={{ textAlign: "right" }}>
        {joinGame}
        <li className="message-body">{props.message}</li>
        <li className="message-header">{"You"}</li>
      </ul>
    );
  }
  return (
    <ul className="message-block" style={{ textAlign: "left" }}>
      <li className="message-header">{props.user}</li>
      <li className="message-body">{props.message}</li>
      {joinGame}
    </ul>
  );
}

function PopUpToast() {
  const [toasts, setToasts] = useState<string[]>([]);
  const { setAuthenticated, sockets } = useOutletContext();
  const socket = sockets.chat;

  useEffect(function () {
    socket.on("chat-pop-up", async (msg: string) => {
      toasts.push(msg);
      setToasts([...toasts]);
    });
    return () => {
      socket.off("chat-pop-up");
    };
  }, []);

  return (
    <>
      {toasts.map((item, i) => (
        <ToastElement key={i} i={i} msg={item}></ToastElement>
      ))}
    </>
  );
}

function ToastElement(props) {
  const [show, setShow] = useState<boolean>(true);
  const style = {
    backgroundColor: "#6A7FDB",
    fontsize: "1rem",
    color: "#EEF0F2",
  };
  return (
    <Toast
      style={style}
      onClose={() => setShow(false)}
      delay={2000}
      show={show}
      autohide
    >
      <Toast.Body>{props.msg}</Toast.Body>
    </Toast>
  );
}

export default ChatWindow;
