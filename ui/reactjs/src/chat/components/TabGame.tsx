import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import genericFetch from "../../utils/genericFetch.ts";

export function TabGame(props) {
  return (
    <>
      <MatchMaking user={props.user}></MatchMaking>
      <SpectateGame user={props.user}></SpectateGame>
    </>
  );
}

function MatchMaking(props) {
  const { setAuthenticated, sockets } = useOutletContext();
  const [label, setLabel] = useState<string>("");
  const pongSocket: any = sockets.pong;

  useEffect(() => {
    const fetchMatchmakingCheck = genericFetch;
    const fetchData = async function (intentNumber?: number) {
      try {
        const data = await fetchMatchmakingCheck(
          `${process.env.REACT_APP_API_URL}:3000/user/matchmakingcheck`,
          "GET"
        );
        if (!data) {
          setAuthenticated(false);
          setTimeout(() => {
            if (intentNumber !== 3) {
              fetchData(intentNumber ? intentNumber + 1 : 1);
            }
          }, 2000);
        } else {
          //console.log(data);
          if (data.inMatchmaking === false) {
            setLabel("Matchmaking");
          } else if (data.inMatchmaking === true) {
            setLabel("Stop Matchmaking");
          }
        }
      } catch (e) {
        //console.log(e);
      }
    };
    fetchData();
  }, []);

  function matchMaking() {
    // Create game here
    if (label === "Matchmaking") {
      pongSocket.emit("chat-matchmaking", `ADD ${props.user} ${pongSocket.id}`);
      setLabel("Stop Matchmaking");
    } else if (label === "Stop Matchmaking") {
      pongSocket.emit("chat-matchmaking-remove", `${pongSocket.id}`);
      setLabel("Matchmaking");
    }
  }

  return (
    <>
      <label>Matchmaking</label>
      <button onClick={matchMaking}>{label}</button>
    </>
  );
}

function SpectateGame(props) {
  const { setAuthenticated, sockets } = useOutletContext();
  const pongSocket: any = sockets.pong;

  function spectateGame(e) {
    e.preventDefault();
    const { username } = e.target.elements;
    // pongSocket.emit('deleteALL', "")
    pongSocket.emit("chat-spectate", {
      username: props.user,
      socketId: pongSocket.id,
      otherUsername: username.value,
    });
    username.value = "";
  }

  return (
    <>
      <form className="form" action="" onSubmit={spectateGame}>
        <label>Spectate game</label>
        <input
          type="text"
          className="message-input"
          id="username"
          autoComplete="off"
          autoCapitalize="on"
          placeholder="username"
          required
        />
        <input type="submit" className="submit-button" value="spectate game" />
      </form>
    </>
  );
}
