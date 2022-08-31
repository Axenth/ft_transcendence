import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import Navbar from "react-bootstrap/Navbar";


interface loginType {
  errorMsg: string,
}

function Login(): React.FC {
  // State variables
  const [state, setState] = useState<loginType>({
    errorMsg: "",
  });

  const imgSrc: string = `${process.env.REACT_APP_FRONTEND_URL}/pong.gif`;

  // Set navigate to redirect
  const navigate = useNavigate();

  return (
    <>
      <Navbar className="navbar">
        <Container className="text-center">
          <Navbar.Brand>henkie pong</Navbar.Brand>
        </Container>
      </Navbar>
      <Container className="offwhite-bg">
        <Row className="pt-5 pb-4 text-center profile-header">
          <Col>
            <Container>
              <p>{state.errorMsg}</p>
              <Image src={imgSrc} />
            </Container>
          </Col>
        </Row>
        <Row className="pt-5 pb-4 text-center profile-header">
          <Col sm={6}>
            <Container>
              <h2>
                Login with{" "}
                <a href={process.env.REACT_APP_CALLBACK_URL}>intra.42.fr</a>
              </h2>
            </Container>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default Login;
