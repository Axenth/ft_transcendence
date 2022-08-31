import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import getCookie from "../utils/getCookie.ts";
import NavLinks from "./NavLinks.tsx";
import SetNick from "./SetNick.tsx";
import SubmitOtp from "./SubmitOtp.tsx";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import { sockets } from "../utils/sockets.ts";
import genericFetch from "../utils/genericFetch.ts";

interface stateType {
  contentToRender: JSX.Element,
}

interface challengeContentType {
  showButtons: boolean,
  text: string,
  challenger: string,
  timeStamp: number,
}

const ProtectedRoutes = function (): React.FC {
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [state, setState] = useState<stateType>({
    contentToRender: <></>,
  });

  const [challengeAlertContent, setChallengeAlertContent] = useState<challengeContentType>({
    showButtons: false,
    text: "",
    challenger: "",
    timeStamp: 0,
  });
  const [showChallengeAlert, setShowChallengeAlert] = useState<boolean>(false);
  const navigate = useNavigate();


  const disconnectSockets = () => {
    sockets.pong.disconnect();
    sockets.chat.disconnect();
    //console.log("Reached disconnect");
  };

  const location = useLocation();


  useEffect(() => {
    async function tryFetchRefresh() {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}:3000/auth/refresh`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getCookie("pongJwtRefreshToken")}`,
            },
          }
        );

        if (res.status === 200) {
          const data = await res.json();
          //console.log("Auth success by refreshing tokens");
          window.sessionStorage.setItem(
            "pongJwtAccessToken",
            data.access_token
          );
          document.cookie = `pongJwtRefreshToken=${data.refresh_token}; SameSite=Lax; path=/`;
          setAuthenticated(true);
        } else {
          //console.log(`Unable to refresh tokens, status:  '${res.status}'.`);
          setState({ ...state, contentToRender: <Navigate to="/login" /> });
          setAuthenticated(false);
        }
      } catch (e) {
        //console.log(
        //  "Error when trying to await fetch() or res.json() when refreshing tokens"
        //);
        //console.log(e);
        disconnectSockets();
        setState({ ...state, contentToRender: <Navigate to="/login" /> });
        setAuthenticated(false);
      }
    }

    async function tryLogin() {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}:3000/auth/login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${window.sessionStorage.getItem(
                "pongJwtAccessToken"
              )}`,
            },
          }
        );

        if (res.status === 200) {
          setAuthenticated(true);
        } else if (res.status === 318) {
          //console.log("Auth status 318");
          const data = await res.json();
          if (data.message === "nickname not set") {
            setState({
              ...state,
              contentToRender: <SetNick setAuth={setAuthenticated} />,
            });
          } else if (data.message === "2fa required") {
            setState({
              ...state,
              contentToRender: <SubmitOtp setAuth={setAuthenticated} />,
            });
          }
        } else if (res.status === 401) {
          //console.log("Gotta request new tokens");
          await tryFetchRefresh();
        } else {
          //console.log("Unable to login");
          setState({ ...state, contentToRender: <Navigate to="/login" /> });
          setAuthenticated(false);
        }
      } catch (e) {
        //console.log(
        //  "Error when trying to await fetch() or res.json() when logging in"
        //);
        //console.log(e);
        disconnectSockets();
        setState({ ...state, contentToRender: <Navigate to="/login" /> });
        setAuthenticated(false);
      }
    }

    try {
      tryLogin();
    } catch (e) {
      //console.log("Error when trying tryLogin()");
      //console.log(e);
    }
  }, [authenticated]);


      // What to do when a challenge error is received, shows modal
      sockets.pong.once('challenge-error', (data:{ msg: string }) => {
        //console.log('Challenge Request error ', data.msg);
        setChallengeAlertContent({...challengeAlertContent, text: data.msg, showButtons: false});
        setShowChallengeAlert(true);
      })
  
      sockets.chat.once('challenge-error-chat', (data:{ msg: string }) => {
        //console.log('Challenge Request errorChat ', data.msg);
        setShowChallengeAlert(false);
      })
  
      // What to do when a challenge is received, shows modal
      sockets.chat.once(
        "challenge-sent",
        (data: { challenger: string; timeStamp: number }) => {
          //console.log(
          //  "Challenge Request from ",
          //  data.challenger,
          //  " .. TimeStamp:",
          //  data.timeStamp
          //);
          setChallengeAlertContent({
            ...challengeAlertContent,
            text: `Player ${data.challenger} has challenged you to a pong match!`,
            showButtons: true,
            challenger: data.challenger,
            timeStamp: data.timeStamp,
          });
          //console.log(challengeAlertContent);
          setShowChallengeAlert(true);
        }
      );
    
    // This is received and triggers when we try to log on two sessions at the same time
    sockets.chat.once('auto-log-off', ()=>{
      //console.log('auto-logoff');
      window.sessionStorage.removeItem("pongJwtAccessToken");
			document.cookie = `pongJwtRefreshToken=; SameSite=Lax; path=/`;
      navigate('/login');
      window.location.reload(false);
    });

    useEffect(() => {
    if(sockets.chat.connected === false)
    {
      //console.log('Connecting to chat');
      sockets.chat.connect();
    }
    if(sockets.pong.connected === false)
    {
      //console.log('Connecting to pong');
      sockets.pong.connect();
    }
    return (()=> {
      //console.log('Unmounting protected route');
      sockets.pong.off('challenge-error');
      sockets.chat.off('challenge-error-chat');
      sockets.chat.off('challenge-sent');
      sockets.chat.off('auto-log-off');
    });
  }, []);


  useEffect(() => {
    //console.log(sockets)
    if (authenticated === true && sockets) {
      //console.log("Auth success");
      //console.log('Socket.chat: ', sockets.chat);

      setState({
        ...state,
        contentToRender: (
          <>
          <Alert show={showChallengeAlert} variant="dark" onClose={()=>{setShowChallengeAlert(false)}} dismissible>
            <Alert.Heading>Pong Alert</Alert.Heading>
            <p>
              {challengeAlertContent.text}
            </p>
            <hr />
            <div className="d-flex justify-content-end">
              {challengeAlertContent.showButtons && <Button onClick={accept} variant="secondary">
                {" "}Accept{" "}
              </Button>}
              {challengeAlertContent.showButtons && <Button onClick={() => setShowChallengeAlert(false)} variant="danger">
              {" "}Close{" "}
              </Button>}
            </div>
          </Alert>
          <NavLinks setAuthenticated={setAuthenticated} />
            <Outlet
              context={{
                authenticated,
                setAuthenticated,
                sockets,
              }}
            />
            </>
          ),
      });
    }
  }, [authenticated, showChallengeAlert]);

  const getMyNick = async function () {
    const fetchProfile = genericFetch;
    const fetchData = async function (intentNumber?: number) {
      try {
        const data = await fetchProfile(
          `${process.env.REACT_APP_API_URL}:3000/user/getprofile`,
          "GET"
        );
        if (!data) {
          setTimeout(() => {
            if (intentNumber !== 3) {
              fetchData(intentNumber ? intentNumber + 1 : 1);
            }
          }, 2000);
        } else {
          return data.nickname;
        }
      } catch (e) {
        //console.log(e);
      }
    };
    return await fetchData();
  };

  const accept = async function () {
    //console.log("Reached accept");
    const timeLimit: number = challengeAlertContent.timeStamp + 25000;
    const timeNow: number = Date.now();
    const username: string = await getMyNick();
    //console.log(
    //  `username: [${username}] challengeAlertContent: ${challengeAlertContent}`
    //);
    if (!challengeAlertContent.challenger || !username) {
      //console.log("No challenteAllertContent.challenger or username");
      return;
    } else if (timeNow > timeLimit) {
      //console.log("Timeout");
      setShowChallengeAlert(false);
    } else {
      //console.log("Reached this context emit");
      sockets.pong.emit("challenge-user", {
        username: username,
        socketId: sockets.pong.id,
        target: challengeAlertContent.challenger,
      });
      setShowChallengeAlert(false);
      navigate("/play");
    }
  };

  return (state.contentToRender);
};

export default ProtectedRoutes;
