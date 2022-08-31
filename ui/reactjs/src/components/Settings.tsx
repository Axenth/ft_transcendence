import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import genericFetch from "../utils/genericFetch.ts";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Badge from "react-bootstrap/Badge";

import bgList from "../utils/bgList.ts";

interface stateType {
  nickname: string,
  userEmail: string,
  userNickname: string,
  avatar: string,
  twoFactorAuth: boolean,
  errorMsg: string,
  successMsg: string,
  bgErrorMsg: string,
  bgSuccessMsg: string,
  bgSelected: string,
  twofaComponent: any,
  showModal: boolean,
  showDisableModal: boolean,
  pongBgList: any,
  showNickname: boolean,
  showChangeNickname: boolean,
}

function Settings(): React.FC {
  // State variables
  const [state, setState] = useState<stateType>({
    nickname: "",
    userEmail: "",
    userNickname: "",
    avatar: "",
    twoFactorAuth: false,
    errorMsg: "",
    successMsg: "",
    bgErrorMsg: "",
    bgSuccessMsg: "",
    bgSelected: "Choose custom background",
    twofaComponent: <div></div>,
    showModal: false,
    showDisableModal: false,
    pongBgList: bgList,
    showNickname: true,
    showChangeNickname: false,
  });

  const handleClose = () => setState({ ...state, showModal: false });
  const handleShow = () =>
    setState({ ...state, showModal: true, twoFactorAuth: true });

  const requestCode = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}:3000/auth/send2facode`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.sessionStorage.getItem('pongJwtAccessToken')}`,
        },
      });
    }
    catch(e)
    {}
  }

  const handleDisableClose = () =>
  {
    setState({ ...state, showDisableModal: false });
  }
  const handleDisableShow = () =>
  {
    requestCode();
    setState({ ...state, showDisableModal: true, twofaComponent: <div></div> });
  }

  // Set navigate for redirecting
  let navigate = useNavigate();

  const { setAuthenticated, sockets } = useOutletContext();

  const disconnectSockets = () => {
		sockets.pong.disconnect();
		sockets.chat.disconnect();
		//console.log("Reached disconnect");
	};

  const pongCustomBg: string = window.sessionStorage.getItem("PongCustomBg");
  for (let i = 0; i < 4; i++) {
    if (
      state.pongBgList[i] === pongCustomBg &&
      state.bgSelected !== pongCustomBg
    ) {
      setState({ ...state, bgSelected: pongCustomBg });
    }
  }
  // fetch data logic from home module of server
  useEffect(function () {
    const fetchSettings = genericFetch;
    const fetchData = async function (intentNumber?: number) {
      try {
        const data = await fetchSettings(
          `${process.env.REACT_APP_API_URL}:3000/user/settings`,
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
          setState({
            ...state,
            userEmail: data.email,
            userNickname: data.nickname,
            avatar: data.avatar,
            twoFactorAuth: data.twoFactorAuth,
          });
        }
      } catch (e) {
        //console.log(e);
      }
    };

    fetchData();
  }, []);

  const submitAvatar = async function (context) {
    context.preventDefault();
    //console.log("Form context.target[0].files[0]");
    //console.log(context.target[0].files[0]);
    if (typeof context.target[0].files[0] === "undefined") {
      setState({ ...state, successMsg: "", errorMsg: "Please select a file" });
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
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        setTimeout(() => {
          submitAvatar(context);
        }, 2000);
        return;
      } else {
        setState({
          ...state,
          errorMsg: `Error: ${data.message}`,
          successMsg: "",
        });
        return;
      }
    } else {
      setState({
        ...state,
        errorMsg: "",
        successMsg: `Success: avatar updated`,
        avatar: data.avatar,
      });
      window.location.reload(false);
      return ;
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
    const data = await res.json();
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
          errorMsg: `Error: ${data.message}`,
          successMsg: "",
        });
        return;
      }
    } else {
      setState({
        ...state,
        errorMsg: "",
        successMsg: `Success: avatar removed`,
        avatar: data.avatar,
      });
    }
  };

  const submit2fa = async function (context) {
    context.preventDefault();
    const options = {
      otp: `${context.target[0].value}`,
    };
    const res = await fetch(
      `${process.env.REACT_APP_API_URL}:3000/auth/submit2fa`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${window.sessionStorage.getItem(
            "pongJwtAccessToken"
          )}`,
        },
        body: JSON.stringify(options),
      }
    );
    const data = await res.json();

    if (res.ok) {
      //console.log("CODE VALID");
      window.sessionStorage.setItem("pongJwtAccessToken", data.access_token);
      document.cookie = `pongJwtRefreshToken=${data.refresh_token}; SameSite=Lax; path=/`;
      handleShow();
    } else {
      if (res.status === 401) {
        setAuthenticated(false);
        setTimeout(() => {
          submit2fa(context);
        }, 2000);
      } else {
        //console.log("CODE INVALID");
      }
      return;
    }
  };

  const disable2fa = async function (context) {
    context.preventDefault();
    const options = {
      otp: `${context.target[0].value}`,
    };
    const res: any = await fetch(
      `${process.env.REACT_APP_API_URL}:3000/auth/disable2fa`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${window.sessionStorage.getItem(
            "pongJwtAccessToken"
          )}`,
        },
        body: JSON.stringify(options),
      }
    );
    if (res.ok) {
      //console.log("CODE VALID");
      setState({ ...state, showDisableModal: false, twoFactorAuth: false });
      navigate("/");
    } else {
      if (res.status === 401) {
        setAuthenticated(false);
        setTimeout(() => {
          disable2fa(context);
        }, 2000);
      } else {
        //console.log("CODE INVALID");
        //handleDisableClose();
      }
      return;
    }
  };

  const toggle2fa = async function (context) {
    context.preventDefault();

    if (state.twoFactorAuth === false) {
      setState({
        ...state,
        twofaComponent: (
          <div>
            <Form onSubmit={submit2fa}>
              Check Email for confirmation code
              <br />
              <br />
              <Form.Control
                type="password"
                placeholder="One-time password"
              />
              <Button
                variant="secondary"
                type="submit"
                className="mx-1 my-1"
              >
                ACTIVATE 2FA
              </Button>
            </Form>
          </div>
        ),
      });
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}:3000/auth/make2fa`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${window.sessionStorage.getItem(
              "pongJwtAccessToken"
            )}`,
          },
        }
      );
      if (res.ok) {
        return ;
      } else if (res.status === 401) {
        setAuthenticated(false);
        setTimeout(() => {
          toggle2fa(context);
        }, 2000);
      }
    } else {
      handleDisableShow();
    }
  };

  const changeCustomBg = function (context) {
    context.preventDefault();
    if (typeof context.target[0].value !== "string") {
      return;
    }

    const bgSelected: string = context.target[0].value;
    //console.log(`changeCustomBg() [${bgSelected}] selected.`);
    if (
      bgSelected === "Default" ||
      bgSelected === "David" ||
      bgSelected === "Oscar" ||
      bgSelected === "Nicolas"
    ) {
      window.sessionStorage.setItem("PongCustomBg", bgSelected);
      setState({
        ...state,
        bgErrorMsg: "",
        bgSuccessMsg: "Successfully changed game background",
        bgSelected: bgSelected,
      });
    } else {
      setState({
        ...state,
        bgErrorMsg: "Choose a valid background",
        bgSuccessMsg: "",
      });
    }
  };

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
  
      // setNick must change tu generic and in try and catch
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
          setAuthenticated(false);
          setTimeout(() => {
            if (intentNumber !== 3) {
              setNick(context, intentNumber ? intentNumber + 1 : 1);
            }
          }, 2000);
        }
        return;
      } else {
        disconnectSockets();
        navigate("/login");
      }
    };

  return (
    <Container className="offwhite-bg">
      <Modal
        show={state.showModal}
        onHide={handleClose}
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>2FA Enabled</Modal.Title>
        </Modal.Header>
        <Modal.Body>
        Codes sent by email have are valid for 15 minutes. They will not be resent unless the time has elapsed.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Understood
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={state.showDisableModal}
        onHide={handleDisableClose}
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>Disable 2FA</Modal.Title>
        </Modal.Header>
        <Form onSubmit={disable2fa}>
        <Modal.Body>
            Check your email to disable. <br />
            <Form.Control type="password" placeholder="One-time password" />
        </Modal.Body>
        <Modal.Footer>
        <Button variant="secondary" type="submit">
              Disable 2FA
            </Button>
          <Button variant="secondary" onClick={handleDisableClose}>
            Cancel
          </Button>
        </Modal.Footer>
        </Form>
      </Modal>

      <Row className="pt-5 pb-4 text-center profile-header">
        <Col>
          <Container  style={{
                maxWidth: 500,
              }}>
            <p className="text-success">{state.successMsg}</p>
            <p className="text-danger">{state.errorMsg}</p>
            <Image
              width="100px"
              height="100px"
              className="my-1"
              roundedCircle={true}
              src={state.avatar}
            />
            {state.showChangeNickname && (
              <Form onSubmit={setNick} className="my-3">
              <Form.Group className="mb-3" controlId="formNickname">
                <Form.Label>Set nickname</Form.Label><br />
                <Form.Text className="text-muted">
                  *It must be unique, you will be logged out on success*
                </Form.Text>
                <Form.Control
                  type="text"
                  placeholder="Enter nickname"
                  value={state.nickname}
                  onChange={(e) => {
                    setState({ ...state, nickname: e.target.value });
                  }}
                />
              </Form.Group>
              <Button variant="secondary" type="submit">
                Submit
              </Button>
            </Form>
            )}
            {state.showNickname && (<h4 className='my-3 mx-2'>{state.userNickname}{' '}<Badge onClick={() => {setState({...state, showNickname: false, showChangeNickname: true,});}} bg="secondary">Edit</Badge></h4>)}
            <Form onSubmit={submitAvatar}>
              <Form.Group controlId="formFileLg" className="mx-1 my-1">
                <Form.Control
                  className="mx-1 my-1"
                  type="file"
                  size="lg"
                  name="avatar"
                />
                <Button variant="secondary" type="submit" className="mx-1 my-2">
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
      </Row>
      <Row className="pt-5 pb-4 text-center justify-content-center">
        <Col>
          <Container style={{
                maxWidth: 500,
              }}>
            <Form onSubmit={changeCustomBg}>
              <p className="text-success">{state.bgSuccessMsg}</p>
              <p className="text-danger">{state.bgErrorMsg}</p>
              <Form.Select aria-label="Default select example">
                <option>{state.bgSelected}</option>
                {state.pongBgList.map((stuff, i) => {
                  return <option value={stuff} key={i}>{stuff}</option>;
                })}
              </Form.Select>
              <Button variant="secondary" type="submit" className="mx-1 my-2">
                Change game background
              </Button>
            </Form>
          </Container>
          <Container style={{
                maxWidth: 500,
              }}>
            Enable / Disable 2FA{" "}
            <Form.Check
              type="switch"
              id="custom-switch"
              onChange={toggle2fa}
              checked={state.twoFactorAuth}
            />
            {state.twofaComponent}
          </Container>
        </Col>
      </Row>
    </Container>
  );
}

export default Settings;
