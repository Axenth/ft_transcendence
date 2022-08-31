import React from "react";
import { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/esm/Dropdown";
import DropdownMenu from "react-bootstrap/esm/DropdownMenu";
import DropdownToggle from "react-bootstrap/esm/DropdownToggle";
import Modal from "react-bootstrap/esm/Modal";
import { useNavigate, useOutletContext } from "react-router-dom";
import genericFetch from "../../utils/genericFetch.ts";

interface Room {
  owner: string;
  users: string[];
  admins: string[];
  muted: Timer[];
  banned: Timer[];
  type: number;
  password?: string;
}

interface Timer {
  user: string;
  timer: Date;
}

export function RoomInfo({ currentRoomId, user }): React.FC {
  const { setAuthenticated, sockets } = useOutletContext();
  const socket = sockets.chat;
  const [data, setData] = useState<Room>();

  useEffect(function () {
    socket.on("update-room-info", (data: Room) => {
      setData(data);
    });
    return () => {
      socket.off("update-room-info");
    };
  }, []);

  return (
    <>
      {data === undefined ? (
        <label>Please select a room</label>
      ) : (
        <div className="overflow">
          <div className="static-room-info">
            <label>Channel-owner {data.type != 2 ? data.owner : "-"}</label>
            <label>password {data.password === "" ? "no" : "yes"}</label>
            <label>
              type{" "}
              {data.type == 0 ? "public" : data.type == 1 ? "private" : "dm"}
            </label>
            {data.owner === user ? (
              <ChangePassword
                currentRoomId={currentRoomId}
                currentUser={user}
              ></ChangePassword>
            ) : (
              <></>
            )}
          </div>
          {data.type == 2 ? (
            <label>No room info for dm's</label>
          ) : (
            <>
              <RoomInfoIO
                data={data}
                currentRoomId={currentRoomId}
                currentUser={user}
              ></RoomInfoIO>
              <RoomInfoBlock
                name="admin-list"
                data={data?.admins}
              ></RoomInfoBlock>
              <RoomInfoBlockTimer
                name="ban-list"
                data={data?.banned}
              ></RoomInfoBlockTimer>
              <RoomInfoBlockTimer
                name="mute-list"
                data={data?.muted}
              ></RoomInfoBlockTimer>
            </>
          )}
        </div>
      )}
    </>
  );
}

function ChangePassword({ currentRoomId, currentUser }): React.FC {
  const { setAuthenticated, sockets } = useOutletContext();
  const socket = sockets.chat;
  const [show, setShow] = useState(false);

  function changePassword(e) {
    e.preventDefault();
    const { password } = e.target.elements;
    socket.emit("change-password", {
      roomId: currentRoomId,
      user: currentUser,
      password: password.value,
    });
    password.value = "";
    handleClose();
  }

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <button className="new-pw" onClick={handleShow}>
        change-password
      </button>
      <Modal show={show} onHide={handleClose}>
        <Modal.Body>
          <Modal.Title>Change Password</Modal.Title>
          <label>Leave empty for no password</label>
          <form
            className="create-room-form"
            action=""
            onSubmit={changePassword}
          >
            <input
              type="text"
              className="message-input"
              id="password"
              autoComplete="off"
              autoCapitalize="on"
              placeholder="password"
            />
            <input type="submit" className="submit-button" value="submit" />
          </form>
        </Modal.Body>
      </Modal>
    </>
  );
}

function RoomInfoIO({ data, currentRoomId, currentUser }) {
  return (
    <>
      <label className="room-info-header">users</label>
      {data.users.map((item, i) => (
        <RoomInfoDropDown
          target={item}
          currentRoomId={currentRoomId}
          currentUser={currentUser}
          data={data}
          key={i}
        ></RoomInfoDropDown>
      ))}
    </>
  );
}

function RoomInfoDropDown({
  target,
  currentRoomId,
  currentUser,
  data,
}): React.FC {
  const { setAuthenticated, sockets } = useOutletContext();
  const navigate = useNavigate();

  function JoinDm(user, target) {
    sockets.chat.emit("join-dm", { user: user, target: target });
  }

  function ViewProfile(target) {
    navigate("/user/profile/" + target);
  }

  function Toggle(currentRoomId, currentUser, target, action) {
    sockets.chat.emit(action, {
      roomid: currentRoomId,
      user: currentUser,
      target: target,
    });
  }

  async function AddFriend(target) {
    try {
      const data = await genericFetch(
        `${process.env.REACT_APP_API_URL}:3000/friendlist/addfriend`,
        "POST",
        { target: target }
      );
      if (!data) {
        setAuthenticated(false);
        setTimeout(() => {
          AddFriend(target);
        }, 2000);
      }
      //console.log(data);
    } catch (e) {
      //console.log(e);
    }
  }

  async function BlockUser(target) {
    try {
      const data = await genericFetch(
        `${process.env.REACT_APP_API_URL}:3000/friendlist/blockuser`,
        "POST",
        { target: target }
      );
      if (!data) {
        setAuthenticated(false);
        setTimeout(() => {
          BlockUser(target);
        }, 2000);
      }
      //console.log(data);
    } catch (e) {
      //console.log(e);
    }
  }

  async function challengeUser(currentUser, target) {
    sockets.pong.emit("challenge-user", {
      username: currentUser,
      socketId: sockets.pong.id,
      target: target,
    });
  }

  return (
    <Dropdown align="start" drop={"right"}>
      <div className="list-item">
        {target}
        {target === currentUser ? <></> : <DropdownToggle></DropdownToggle>}
      </div>
      <DropdownMenu>
        <Dropdown.Item onClick={() => ViewProfile(target)}>
          view-profile
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            challengeUser(currentUser, target);
          }}
        >
          challenge-to-match
        </Dropdown.Item>
        <Dropdown.Item onClick={() => JoinDm(currentUser, target)}>
          direct message
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() =>
            Toggle(currentRoomId, currentUser, target, "toggle-admin")
          }
        >
          toggle-admin
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() =>
            Toggle(currentRoomId, currentUser, target, "toggle-mute")
          }
        >
          toggle-mute
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() =>
            Toggle(currentRoomId, currentUser, target, "toggle-ban")
          }
        >
          toggle-ban
        </Dropdown.Item>
        <Dropdown.Item onClick={() => AddFriend(target)}>
          add-friend
        </Dropdown.Item>
        <Dropdown.Item onClick={() => BlockUser(target)}>
          block-user
        </Dropdown.Item>
      </DropdownMenu>
    </Dropdown>
  );
}

function RoomInfoBlock(props) {
  return (
    <>
      <label className="room-info-header">{props.name}</label>
      <div className="room-info-list">
        {props.data.map((item, i) => (
          <div className="room-info-list-item" key={i}>
            {item}
          </div>
        ))}
      </div>
    </>
  );
}

function RoomInfoBlockTimer(props) {
  return (
    <>
      <label className="room-info-header">{props.name}</label>
      <div className="room-info-list">
        {props.data.map((item, i) => (
          <div className="room-info-list-item" key={i}>
            {item.user}
          </div>
        ))}
      </div>
    </>
  );
}
