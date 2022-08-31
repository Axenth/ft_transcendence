import React, { useState, useEffect } from "react";
import {
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import genericFetch from "../utils/genericFetch.ts";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import Card from "react-bootstrap/Card";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faHotdog, faTableTennisPaddleBall, faFaceFrown, faFaceTired, faRobot } from '@fortawesome/free-solid-svg-icons';
import {ladder} from '../types/ladder.ts';
import calculateLadder from '../utils/calculateLadder.ts';

interface profileType {
  userEmail: string,
  status: string,
  userNickname: string,
  avatar: string,
  wins: number,
  losses: number,
  matches: [],
  achievements: [],
}


function Profile(): React.FC {
  // State variables
  const [state, setState] = useState<profileType>({
    userEmail: "",
    status: "OFFLINE",
    userNickname: "",
    avatar: "",
    wins: -42,
    losses: -42,
    matches: [],
    achievements: [],
  });

  const { setAuthenticated, sockets } = useOutletContext();

  // Set navigate for redirecting
  let navigate = useNavigate();

  // Params
  let params = useParams();

  const [statusBadgeColor, setStatusBadgeColor] = useState<string>("");
  const [challengeLabel, setChallengeLabel] = useState<string>(
    "Challenge to a pong match!"
  );
  const [currentUser, setCurrentUser] = useState<string>("");


  // fetch data logic from home module of server
  useEffect(function () {
    //console.log(params);
    const fetchProfile = genericFetch;
    let fetchData = async function (intentNumber?: number) {
      try {
        const data = await fetchProfile(
          `${process.env.REACT_APP_API_URL}:3000/user/getprofilebynick`,
          "POST",
          { nickname: params.id }
        );
        if (!data) {
          navigate("/");
        } else {
          //console.log("received: ", data);
          setState({
            ...state,
            userEmail: data.email,
            userNickname: data.nickname,
            avatar: data.avatar,
            wins: data.wins,
            losses: data.losses,
            matches: data.matches,
            status: data.status,
            achievements: data.achievements,
          });
          setStatusBadgeColor(
            data.status === "ONLINE" ? "success" : "secondary"
          );
        }
      } catch (e) {
        //console.log(e);
      }
    };

    fetchData();

    const fetchMyData = genericFetch;
    fetchData = async function (intentNumber?: number) {
      try {
        const data = await fetchMyData(
          `${process.env.REACT_APP_API_URL}:3000/user/getprofile`,
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
          setCurrentUser(data.nickname);
        }
      } catch (e) {
        //console.log(e);
      }
    };

    fetchData();

    if (
      currentUser === state.userNickname &&
      currentUser !== "" &&
      state.userNickname !== ""
    ) {
      navigate("/");
    }

    sockets.pong.on('chat-redirect', (message: string) => {
			// Navigate to pong
			if (message === "OK")
				navigate('/play');
			else
			{
				//console.log("Failed to redirect");
			}
		});

    return (() => {
      sockets.pong.off('chat-redirect');
    });
  }, []);

  const challenge = function () {
    sockets.pong.emit("challenge-user", {
      username: currentUser,
      socketId: sockets.pong.id,
      target: state.userNickname,
    });
    //setChallengeLabel("Challenge request sent!");
  };

  const spectate = function () {
    sockets.pong.emit(
      "chat-spectate",
      {
        username: currentUser,
        socketId: sockets.pong.id,
        otherUsername: state.userNickname,
      }
    );
    //navigate("/play");
  };

  return (
    <Container className="offwhite-bg">
      <Row className="pt-5 pb-4 text-center profile-header">
        <Col>
          <Container>
            <Image
              width="100px"
              height="100px"
              className="py-1"
              roundedCircle={true}
              src={state.avatar}
            />
            <h1>
              {state.userNickname ? `${state.userNickname}` : "loading..."}
            </h1>
            <h2>
              <Badge bg={statusBadgeColor}>{state.status}</Badge>
            </h2>
            <p className="fs-4">
              <span className="text-success">{state.wins} Wins </span> /{" "}
              <span className="text-danger"> {state.losses} Losses</span>
            </p>
            <p>
              Rank: {state.userNickname && calculateLadder(state.wins) === ladder.NEW_PLAYER && "New player"}
              {state.userNickname && calculateLadder(state.wins) === ladder.BRONZE && "Bronze"}
              {state.userNickname && calculateLadder(state.wins) === ladder.IRON && "Iron"}
              {state.userNickname && calculateLadder(state.wins) === ladder.SILVER && "Silver"}
              {state.userNickname && calculateLadder(state.wins) === ladder.PLATINUM && "Platinum"}
              {state.userNickname && calculateLadder(state.wins) === ladder.DIAMOND && "Diamond"}
            </p>
            {state.status === "ONLINE" && (
              <button onClick={challenge}>{challengeLabel}</button>
            )}
            {state.status === "GAME" && (
              <button onClick={spectate}>Spectate Current Game</button>
            )}
          </Container>
        </Col>
      </Row>
      <Row className="pb-4 text-center profile-header">
      {state.achievements.length > 0 && <h1 className="mt-2 mb-5">Achievements</h1>}
            {state.achievements.length > 0 && 
                state.achievements.map((element, index) => {
                  if (element === 'missPersonality')
                  {
                    return (
                      <Col key={index} md={4} className='mt-3'>
                      <Container>
                      <Card style={{ width: '18rem' }}>
                        <Card.Body>
                          <FontAwesomeIcon style={{width: 100, height: 100, color: '#D9027D'}} className='m-2' icon={faCrown} />
                          <Card.Title>Personality Award</Card.Title>
                          <Card.Text>
                            Upload a custom avatar.
                          </Card.Text>
                        </Card.Body>
                      </Card>
                      </Container>
                      </Col>
                    );
                  }
                  else if (element === 'wiener')
                  {
                    return (
                      <Col key={index} md={4} className='mt-3'>
                      <Container>
                      <Card style={{ width: '18rem' }}>
                        <Card.Body>
                          <FontAwesomeIcon style={{width: 100, height: 100, color: '#B75E4A'}} className='m-2' icon={faHotdog} />
                          <Card.Title>Wiener</Card.Title>
                          <Card.Text>
                            Win 5 matches.
                          </Card.Text>
                        </Card.Body>
                      </Card>
                      </Container>
                      </Col>
                    );
                  }
                  else if (element === 'l33tPonger')
                  {
                    return (
                      <Col key={index} md={4} className='mt-3'>
                      <Container>
                      <Card style={{ width: '18rem' }}>
                        <Card.Body>
                          <FontAwesomeIcon style={{width: 100, height: 100, color: '#FEDD00'}} className='m-2' icon={faTableTennisPaddleBall} />
                          <Card.Title>L33t Ponger</Card.Title>
                          <Card.Text>
                            Win 10 matches.
                          </Card.Text>
                        </Card.Body>
                      </Card>
                      </Container>
                      </Col>
                    );
                  }
                  else if (element === 'n00bLoser')
                  {
                    return (
                      <Col key={index} md={4} className='mt-3'>
                      <Container>
                      <Card style={{ width: '18rem' }}>
                        <Card.Body>
                          <FontAwesomeIcon style={{width: 100, height: 100, color: '#BFA600'}} className='m-2' icon={faFaceFrown} />
                          <Card.Title>N00b Loser</Card.Title>
                          <Card.Text>
                            Lose 5 matches.
                          </Card.Text>
                        </Card.Body>
                      </Card>
                      </Container>
                      </Col>
                    );
                  }
                  else if (element === 'proLoser')
                  {
                    return (
                      <Col key={index} md={4} className='mt-3'>
                      <Container>
                      <Card style={{ width: '18rem' }}>
                        <Card.Body>
                          <FontAwesomeIcon style={{width: 100, height: 100, color: '#BFA600'}} className='m-2' icon={faFaceTired} />
                          <Card.Title>Pro Loser</Card.Title>
                          <Card.Text>
                            Lose 10 matches.
                          </Card.Text>
                        </Card.Body>
                      </Card>
                      </Container>
                      </Col>
                    );
                  }
                  else if (element === 'noLife')
                  {
                    return (
                      <Col key={index} md={4} className='mt-3'>
                      <Container>
                      <Card style={{ width: '18rem' }}>
                        <Card.Body>
                          <FontAwesomeIcon style={{width: 100, height: 100, color: 'gray'}} className='m-2' icon={faRobot} />
                          <Card.Title>No Life</Card.Title>
                          <Card.Text>
                            Finish 20 matches.
                          </Card.Text>
                        </Card.Body>
                      </Card>
                      </Container>
                      </Col>
                    );
                  }
                  else
                  {
                    return <div key={index}></div>;
                  }
                })}
      </Row>
      <Row className="pb-4 text-center profile-header">
        <Col>
          <Container>
          {state.matches.length > 0 && (
            <><h1 className="mt-5">Match History</h1>
            <Table>
              <thead>
                <tr>
                  <th>Against</th>
                  <th>Score</th>
                  <th>Enemy Score</th>
                  <th>Result</th>
                </tr>

                {state.matches.map((element) => {
                  return (
                    <tr key={element.id}>
                      <th>{element.against}</th>
                      <th>{element.playerScore}</th>
                      <th>{element.enemyScore}</th>
                      <th>{element.result}</th>
                    </tr>
                  );
                })}
              </thead>
            </Table></>)}
          </Container>
        </Col>
      </Row>
    </Container>
  );
}

export default Profile;
