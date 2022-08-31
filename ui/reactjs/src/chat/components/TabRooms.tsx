import React from "react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Modal from "react-bootstrap/Modal";

export function CreateRoom(props) {
  const { setAuthenticated, sockets } = useOutletContext();
  const socket: any = sockets.chat;
  const [show, setShow] = useState<boolean>(false);

  function createRoom(e): React.FC {
    e.preventDefault();
    const { roomid } = e.target.elements;
    const { roomtype } = e.target.elements;
    const { passwordcreate } = e.target.elements;
    socket.emit("create-room", {
      roomid: roomid.value,
      user: props.user,
      roomtype: roomtype.value,
      password: passwordcreate.value,
    });
    roomid.value = "";
    handleClose();
  }

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <button onClick={handleShow}>Create Room</button>

      <Modal show={show} onHide={handleClose}>
        <Modal.Body>
          <Modal.Title>Create Room</Modal.Title>
          <form className="create-room-form" action="" onSubmit={createRoom}>
            <input
              type="text"
              className="message-input"
              id="roomid"
              autoComplete="off"
              autoCapitalize="on"
              placeholder="room-id"
              required
            />
            <input
              type="text"
              className="message-input"
              id="passwordcreate"
              autoComplete="off"
              autoCapitalize="on"
              placeholder="password --- optional"
            />
            <select
              id="roomtype"
              className="message-input"
              defaultValue=""
              required
            >
              <option value="" disabled hidden>
                Select a roomtype
              </option>
              <option value="public">public</option>
              <option value="private">private</option>
            </select>
            <input type="submit" className="submit-button" value="create" />
          </form>
        </Modal.Body>
      </Modal>
    </>
  );
}

export function JoinRoom(props): React.FC {
  const { setAuthenticated, sockets } = useOutletContext();
  const socket = sockets.chat;
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  function joinRoom(e) {
    e.preventDefault();
    const { roomid } = e.target.elements;
    const { password } = e.target.elements;
    socket.emit("join-room", {
      roomid: roomid.value,
      user: props.user,
      password: password.value,
    });
    password.value = "";
    roomid.value = "";
    handleClose();
  }

  return (
    <>
      <button onClick={handleShow}> Join Room</button>

      <Modal show={show} onHide={handleClose}>
        <Modal.Body>
          <Modal.Title>Join Room</Modal.Title>
          <form className="form" action="" onSubmit={joinRoom}>
            <input
              type="text"
              className="message-input"
              id="roomid"
              autoComplete="off"
              autoCapitalize="on"
              placeholder="room-id"
              required
            />
            <input
              type="text"
              className="message-input"
              id="password"
              autoComplete="off"
              autoCapitalize="on"
              placeholder="password --- optional"
            />
            <input type="submit" className="submit-button" value="join" />
          </form>
        </Modal.Body>
      </Modal>
    </>
  );
}

export function LeaveRoom({ currentRoomId, currentUser }) {
  const { setAuthenticated, sockets } = useOutletContext();
  const socket = sockets.chat;

  function leaveRoom() {
    socket.emit("leave-room", { roomid: currentRoomId, user: currentUser });
    //console.log(currentRoomId);
  }

  return (
    <>
      <button onClick={leaveRoom}> Leave Current Room</button>
    </>
  );
}

export function PublicRoomList(props) {
  const [roomList, setRoomList] = useState<string[]>([]);
  const { setAuthenticated, sockets } = useOutletContext();
  const socket = sockets.chat;

  useEffect(function () {
    socket.emit("req-public-room-list");
    socket.on("update-public-room-list", (publicRoomList) => {
      setRoomList(publicRoomList);
    });
    return () => {
      socket.off("update-public-room-list");
    };
  }, []);

  return (
    <>
      <div className="room-list">
        {roomList.length !== 0 ? (
          roomList.map((item, i) => (
            <RoomButton
              currentRoomId={props.currentRoomId}
              roomId={item}
              user={props.user}
              key={i}
            ></RoomButton>
          ))
        ) : (
          <label>No public rooms</label>
        )}
      </div>
    </>
  );
}

export function PrivateRoomList(props) {
  const [roomList, setRoomList] = useState<string[]>([]);
  const { setAuthenticated, sockets } = useOutletContext();
  const socket = sockets.chat;

  useEffect(function () {
    socket.on("update-private-room-list", (privateRoomList) => {
      setRoomList(privateRoomList);
    });
    return () => {
      socket.off("update-private-room-list");
    };
  }, []);

  useEffect(
    function () {
      socket.emit("req-private-room-list", props.user);
    },
    [props.user]
  );

  return (
    <>
      <div className="room-list">
        {roomList.length !== 0 ? (
          roomList.map((item, i) => (
            <RoomButton
              currentRoomId={props.currentRoomId}
              roomId={item}
              user={props.user}
              key={i}
            ></RoomButton>
          ))
        ) : (
          <label>No private rooms</label>
        )}
      </div>
    </>
  );
}

function RoomButton(props) {
  const { setAuthenticated, sockets } = useOutletContext();
  const socket = sockets.chat;

  function handleClick(e) {
    socket.emit("join-room", { roomid: props.roomId, user: props.user });
  }
  return (
    <button
      className={props.currentRoomId === props.roomId ? "button-select" : ""}
      onClick={handleClick}
      value={props.roomId}
    >
      <div className="text-overflow">{props.roomId}</div>
    </button>
  );
}
