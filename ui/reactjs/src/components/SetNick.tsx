import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Navbar from "react-bootstrap/Navbar";

interface stateType{
  avatarErrorMsg: string,
  errorMsg: string,
  successMsg: string,
  nickname: string,
  avatar: string,
}

function SetNick({ setAuth }): React.FC {
  // State variables
  const [state, setState] = useState<stateType>({
    avatarErrorMsg: "",
    errorMsg: "",
    successMsg: "",
    nickname: "",
    avatar: `${process.env.REACT_APP_FRONTEND_URL}:3000/srcs/users/default.jpg`,
  });

  // Set navigate to redirect
  const navigate = useNavigate();

  // Function if param is found on hook bellow
  const setNick = async function (context: any, intentNumber?: number) {
    context.preventDefault();
    //console.log("Trying to set nick");
    if (context.target[0].value === "") {
      setState({
        ...state,
        successMsg: "",
        errorMsg: "Enter a valid nickname",
      });
      return;
    }

    // Fetch from server auth module
    const res: any = await fetch(
      `${process.env.REACT_APP_API_URL}:3000/user/setnick`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${window.sessionStorage.getItem(
            "pongJwtAccessToken"
          )}`,
        },
        body: JSON.stringify({
          nickname: context.target[0].value,
        }),
      }
    );
    if (!res.ok) {
      if (res.status !== 401) {
        setState({
          ...state,
          errorMsg: "Error: Possibly taken, try another nickname.",
        });
      } else {
        //console.log("On nickname page.. gotta refresh tokens!");
        setAuth(false);
        setTimeout(() => {
          if (intentNumber !== 3) {
            setNick(context, intentNumber ? intentNumber + 1 : 1);
          }
        }, 2000);
      }
      return;
    } else {
      setAuth(true);
      navigate("/");
      window.location.reload(false);
    }
  };

  const submitAvatar = async function (context) {
    context.preventDefault();
    //console.log("Form context.target[0].files[0]");
    //console.log(context.target[0].files[0]);
    if (typeof context.target[0].files[0] === "undefined") {
      setState({
        ...state,
        successMsg: "",
        avatarErrorMsg: "Please select a file",
      });
      return;
    }
    let formData = new FormData();
    formData.append(
      "avatar",
      context.target[0].files[0],
      context.target[0].files[0].name
    );
    //console.log(formData);
    const res = await fetch(
      `${process.env.REACT_APP_API_URL}:3000/user/changeavatar`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem(
            "pongJwtAccessToken"
          )}`,
        },
        body: formData,
      }
    );
    const data: any = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        setTimeout(() => {
          submitAvatar(context);
        }, 2000);
        return;
      } else {
        setState({
          ...state,
          avatarErrorMsg: `Error: ${data.message}`,
          successMsg: "",
        });
        return;
      }
    } else {
      setState({
        ...state,
        avatarErrorMsg: "",
        successMsg: `Success: avatar updated`,
        avatar: data.avatar,
      });
    }
  };

  const removeAvatar = async function (context) {
    context.preventDefault();
    //console.log("Attempting to remove avatar");
    const res = await fetch(
      `${process.env.REACT_APP_API_URL}:3000/user/removeavatar`,
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
    const data: any = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        setAuthenticated(false);
        setTimeout(() => {
          removeAvatar(context);
        }, 2000);
        return;
      } else {
        setState({
          ...state,
          avatarErrorMsg: `Error: ${data.message}`,
          successMsg: "",
        });
        return;
      }
    } else {
      setState({
        ...state,
        avatarErrorMsg: "",
        successMsg: `Success: avatar removed`,
        avatar: data.avatar,
      });
    }
  };

  return (
    <>
      <Navbar className="navbar">
        <Container className="text-center">
          <Navbar.Brand>henkie pong</Navbar.Brand>
        </Container>
      </Navbar>
      <Container className="offwhite-bg">
        <Row className="pt-5 pb-4 text-center profile-header">
          <Col sm={12}>
            <Container
              style={{
                maxWidth: 500,
              }}
            >
              <p className="text-success">{state.successMsg}</p>
              <p className="text-danger">{state.avatarErrorMsg}</p>
              {state.avatar && (
                <Image
                  width="100px"
                  height="100px"
                  className="my-1"
                  roundedCircle={true}
                  src={state.avatar}
                />
              )}
              <Form onSubmit={submitAvatar}>
                <Form.Group controlId="formFileLg" className="mx-1 my-1">
                  <Form.Control
                    className="mx-1 my-1"
                    type="file"
                    size="lg"
                    name="avatar"
                  />
                  <Button
                    variant="secondary"
                    type="submit"
                    className="mx-1 my-2"
                  >
                    Change Avatar
                  </Button>
                </Form.Group>
              </Form>
              <Button
                onClick={removeAvatar}
                variant="danger"
                type="submit"
                className="mx-1 my-1"
              >
                Remove Avatar
              </Button>
            </Container>
          </Col>

          <Col sm={12}>
            <Container
              style={{
                maxWidth: 500,
              }}
            >
              <Form onSubmit={setNick}>
                <Form.Group className="mb-3" controlId="formNickname">
                  <Form.Label>Set nickname</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter nickname"
                    value={state.nickname}
                    onChange={(e) => {
                      setState({ ...state, nickname: e.target.value });
                    }}
                  />
                  <p className="text-danger">{state.errorMsg}</p>
                  <Form.Text className="text-muted">
                    It must be unique.
                  </Form.Text>
                </Form.Group>
                <Button variant="secondary" type="submit">
                  Submit
                </Button>
              </Form>
            </Container>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default SetNick;
