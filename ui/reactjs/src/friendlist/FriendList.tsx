import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import Image from "react-bootstrap/Image";
import Dropdown from "react-bootstrap/Dropdown";
import "./style.Friendlist.css";
import React from "react";
import DropdownToggle from "react-bootstrap/esm/DropdownToggle";
import DropdownMenu from "react-bootstrap/esm/DropdownMenu";
import Toast from "react-bootstrap/esm/Toast";
import DropdownItem from "react-bootstrap/DropdownItem";

async function genericFetch(endpoint: string, type: string, body?: any) {
  let res: any;
  if (!body) {
    res = await fetch(`${process.env.REACT_APP_API_URL}:3000` + endpoint, {
      method: type,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${window.sessionStorage.getItem(
          "pongJwtAccessToken"
        )}`,
      },
    });
  } else {
    res = await fetch(`${process.env.REACT_APP_API_URL}:3000` + endpoint, {
      method: type,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${window.sessionStorage.getItem(
          "pongJwtAccessToken"
        )}`,
      },
      body: JSON.stringify(body),
    });
  }
  if (!res) {
    const data: any = await res.json();
    //console.log(data);
    document.cookie = "pongJwtRefreshToken=; SameSite=Lax; path=/";
    window.sessionStorage.removeItem("pongJwtAccessToken");
    return false;
  }
  if (res.ok) {
    const data = await res.json();
    //console.log(data);
    return data;
  }
  return false;
}

export function FriendList(props): React.FC {
  return (
    <>
      <Tabs defaultActiveKey="friends" transition={false} fill>
        <Tab eventKey="friends" title="Friends">
          <DisplayFriends user={props.user}></DisplayFriends>
        </Tab>
        <Tab eventKey="request" title="Requests">
          <DisplayRequests></DisplayRequests>
        </Tab>
        <Tab eventKey="blocked" title="Blocked">
          <DisplayBlocked></DisplayBlocked>
        </Tab>
      </Tabs>
      <FriendListToast></FriendListToast>
    </>
  );
}

interface Friends {
  nickname: string;
  avatar: string;
  status: string;
}

function DisplayFriends(props): React.FC {
  const [friends, setFriends] = useState<Friends[]>([]);
  const { setAuthenticated, sockets } = useOutletContext();

  async function fetchFriends(intentNumber?: number) {
    try {
      const data = await genericFetch("/friendlist/getfriends", "GET");
      if (!data) {
        setAuthenticated(false);
      } else {
        setFriends(data);
      }
    } catch (e) {
      //console.log(e);
    }
  }

  async function addFriend(e) {
    e.preventDefault();
    const { username } = e.target.elements;
    try {
      const data = await genericFetch("/friendlist/addfriend", "POST", {
        target: username.value,
      });
      if (!data) {
        setAuthenticated(false);
      }
      //console.log(data);
      fetchFriends();
    } catch (e) {
      //console.log(e);
    }
  }

  useEffect(function () {
    sockets.chat.on("update-friends", () => {
      fetchFriends();
    });
    return () => {
      sockets.chat.off("update-friends");
    };
  }, []);

  useEffect(function () {
    fetchFriends();
  }, []);

  return (
    <>
      <label>Add friend</label>
      <form className="form" action="" onSubmit={addFriend}>
        <input
          type="text"
          className="message-input"
          id="username"
          autoComplete="off"
          placeholder="username"
          required
        />
        <input type="submit" className="submit-button" value="add friend" />
      </form>
      <div className="list-wrapper">
        <label>Friends</label>
        {friends.map((item, i) => (
          <FriendListItem
            status={item.status}
            avatar={item.avatar}
            nickname={item.nickname}
            key={i}
            user={props.user}
          ></FriendListItem>
        ))}
      </div>
    </>
  );
}

function FriendListItem(props): React.FC {
  const offline = <div className="friendlist-status status-offline"></div>;
  const online = <div className="friendlist-status status-online"></div>;
  const watching = <div className="friendlist-status status-spectating"></div>;
  const game = <div className="friendlist-status status-ingame"></div>;
  const [status, setStatus] = useState(online);

  useEffect(
    function () {
      if (props.status === "OFFLINE") setStatus(offline);
      else if (props.status === "ONLINE") setStatus(online);
      else if (props.status === "GAME") setStatus(game);
      else if (props.status === "WATCHING") setStatus(watching);
    },
    [props.status]
  );

  return (
    <>
      <Dropdown align="end">
        <div className="list-item">
          <div className="friend-list-item">
            <div>{status}</div>
            <div>
              <div className="friendlist-user">
                <Image
                  className="friendlist-image"
                  width="25px"
                  height="25px"
                  src={props.avatar}
                />
                <div className="friendlist-name">{props.nickname}</div>
              </div>
            </div>
          </div>
          <DropdownToggle></DropdownToggle>
        </div>
        <DropdownMenu>
          <ShowProfile target={props.nickname}></ShowProfile>
          {props.status === "ONLINE" && (
            <ChallengeToMatch
              username={props.user}
              target={props.nickname}
            ></ChallengeToMatch>
          )}
          <JoinDm target={props.nickname} user={props.user}></JoinDm>
          <RemoveFriend target={props.nickname}></RemoveFriend>
        </DropdownMenu>
      </Dropdown>
    </>
  );
}

function ShowProfile({ target }) {
  const navigate = useNavigate();
  return (
    <Dropdown.Item
      onClick={() => {
        navigate("/user/profile/" + target);
      }}
    >
      show-profile
    </Dropdown.Item>
  );
}

function ChallengeToMatch({ username, target }) {
  const { sockets } = useOutletContext();
  function challengeUser() {
    sockets.pong.emit("challenge-user", {
      username: username,
      socketId: sockets.pong.id,
      target: target,
    });
  }
  return (
    <DropdownItem onClick={challengeUser}>challenge-to-match</DropdownItem>
  );
}

function JoinDm({ target, user }) {
  const { setAuthenticated, sockets } = useOutletContext();

  function joinDM() {
    sockets.chat.emit("join-dm", { user: user, target: target });
  }
  return <Dropdown.Item onClick={joinDM}>direct message</Dropdown.Item>;
}

function RemoveFriend({ target }) {
  const { setAuthenticated, sockets } = useOutletContext();

  async function removeFriend() {
    try {
      const data = await genericFetch("/friendlist/removefriend", "POST", {
        target: target,
      });
      if (!data) {
        setAuthenticated(false);
      }
      //console.log(data);
    } catch (e) {
      //console.log(e);
    }
  }

  return <Dropdown.Item onClick={removeFriend}>remove-friend</Dropdown.Item>;
}

function DisplayRequests() {
  const [requests, setRequests] = useState<
    { avatar: string; nickname: string }[]
  >([]);
  const [pending, setPending] = useState<
    { avatar: string; nickname: string }[]
  >([]);
  const { setAuthenticated, sockets } = useOutletContext();

  async function fetchRequests() {
    try {
      const data = await genericFetch("/friendlist/getfriendrequests", "GET");
      if (!data) {
        setAuthenticated(false);
      } else {
        setRequests(data);
      }
    } catch (e) {
      //console.log(e);
    }
  }

  async function fetchPending() {
    try {
      const data = await genericFetch("/friendlist/getpending", "GET");
      if (!data) {
        setAuthenticated(false);
      } else {
        setPending(data);
      }
    } catch (e) {
      //console.log(e);
    }
  }

  useEffect(function () {
    sockets.chat.on("update-requests", () => {
      fetchRequests();
    });
    return () => {
      sockets.chat.off("update-requests");
    };
  }, []);

  useEffect(function () {
    sockets.chat.on("update-pending", () => {
      fetchPending();
    });
    return () => {
      sockets.chat.off("update-pending");
    };
  }, []);

  async function rejectRequest(nickname) {
    try {
      const data = await genericFetch("/friendlist/rejectrequest", "POST", {
        target: nickname,
      });
      if (!data) {
        setAuthenticated(false);
      }
      //console.log(data);
      fetchRequests();
    } catch (e) {
      //console.log(e);
    }
  }

  async function rejectPending(nickname) {
    try {
      const data = await genericFetch("/friendlist/rejectpending", "POST", {
        target: nickname,
      });
      if (!data) {
        setAuthenticated(false);
      }
      //console.log(data);
      fetchPending();
    } catch (e) {
      //console.log(e);
    }
  }

  async function acceptRequest(nickname) {
    try {
      const data = await genericFetch("/friendlist/addfriend", "POST", {
        target: nickname,
      });
      if (!data) {
        setAuthenticated(false);
      }
      fetchRequests();
    } catch (e) {
      //console.log(e);
    }
  }

  useEffect(function () {
    fetchRequests();
    fetchPending();
  }, []);

  return (
    <>
      <div className="list-wrapper">
        <label>Friend Requests</label>
        {requests.map((item, i) => (
          <RequestListItem
            avatar={item.avatar}
            nickname={item.nickname}
            acceptRequest={acceptRequest}
            rejectRequest={rejectRequest}
            key={i}
          ></RequestListItem>
        ))}
      </div>
      <label>Pending Requests</label>
      {pending.map((item, i) => (
        <RequestListItem
          avatar={item.avatar}
          nickname={item.nickname}
          acceptRequest={undefined}
          rejectRequest={rejectPending}
          key={i}
        ></RequestListItem>
      ))}
    </>
  );
}

function RequestListItem({ avatar, nickname, acceptRequest, rejectRequest }) {
  const { setAuthenticated, sockets } = useOutletContext();

  return (
    <>
      <div className="list-item request-item">
        <div className="friendlist-user">
          <Image
            className="friendlist-image"
            width="25px"
            height="25px"
            src={avatar}
          />
          <div className="friendlist-name">{nickname}</div>
        </div>
        <div className="button-hide">
          {acceptRequest !== undefined ? (
            <button
              className="accept-green"
              onClick={(e) => acceptRequest(nickname)}
            >
              &#10004;
            </button>
          ) : (
            <></>
          )}
          <button
            className="reject-red"
            onClick={(e) => rejectRequest(nickname)}
          >
            &#10006;
          </button>
        </div>
      </div>
    </>
  );
}

function DisplayBlocked() {
  const [blocked, setBlocked] = useState<
    { nickname: string; avatar: string }[]
  >([]);
  const { setAuthenticated, sockets } = useOutletContext();
  let navigate = useNavigate();

  async function fetchBlocked() {
    try {
      const data = await genericFetch("/friendlist/getblocked", "GET");
      if (!data) {
        setAuthenticated(false);
      } else {
        setBlocked(data);
      }
    } catch (e) {
      //console.log(e);
    }
  }

  async function blockUser(e) {
    e.preventDefault();
    const { username } = e.target.elements;
    try {
      const data = await genericFetch("/friendlist/blockuser", "POST", {
        target: username.value,
      });
      if (!data) {
        setAuthenticated(false);
      }
      //console.log(data);
      fetchBlocked();
    } catch (e) {
      //console.log(e);
    }
  }

  async function unBlockUser(nickname) {
    try {
      const data = await genericFetch("/friendlist/unblockuser", "POST", {
        target: nickname,
      });
      if (!data) {
        setAuthenticated(false);
      }
      //console.log(data);
      fetchBlocked();
    } catch (e) {
      //console.log(e);
    }
  }

  useEffect(function () {
    sockets.chat.on("update-blocked", () => {
      fetchBlocked();
    });
    return () => {
      sockets.chat.off("update-blocked");
    };
  }, []);

  useEffect(function () {
    fetchBlocked();
  }, []);

  return (
    <>
      <label>Block User</label>
      <form className="form" action="" onSubmit={blockUser}>
        <input
          type="text"
          className="message-input"
          id="username"
          autoComplete="off"
          placeholder="username"
          required
        />
        <input type="submit" className="submit-button" value="block user" />
      </form>
      <div className="list-wrapper">
        <label>Blocked User's</label>
        {blocked.map((item, i) => (
          <BlockedListItem
            avatar={item.avatar}
            nickname={item.nickname}
            unBlockUser={unBlockUser}
            key={i}
          ></BlockedListItem>
        ))}
      </div>
    </>
  );
}

function BlockedListItem({ avatar, nickname, unBlockUser }) {
  return (
    <>
      <div className="list-item request-item">
        <div className="friendlist-user">
          <Image
            className="friendlist-image"
            width="25px"
            height="25px"
            src={avatar}
          />
          <div className="friendlist-name">{nickname}</div>
        </div>
        <div className="button-hide">
          <button className="reject-red" onClick={(e) => unBlockUser(nickname)}>
            &#10006;
          </button>
        </div>
      </div>
    </>
  );
}

function FriendListToast() {
  const [toasts, setToasts] = useState<string[]>([]);
  const { setAuthenticated, sockets } = useOutletContext();
  const socket = sockets.chat;

  useEffect(function () {
    socket.on("friendlist-pop-up", async (toast: Toast) => {
      toasts.push(toast);
      setToasts([...toasts]);
    });
    return () => {
      socket.off("friendlist-pop-up");
    };
  }, []);

  return (
    <div className="friendlist-toast-wrapper">
      {toasts.map((item, i) => (
        <ToastElement key={i} msg={item}></ToastElement>
      ))}
    </div>
  );
}

function ToastElement({ msg }) {
  const [show, setShow] = useState(true);
  return (
    <Toast onClose={() => setShow(false)} delay={10000} show={show} autohide>
      <Toast.Header>{msg}</Toast.Header>
    </Toast>
  );
}
