import React from 'react';
import { Link } from 'react-router-dom';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Navbar from "react-bootstrap/Navbar";

function NotFound(): React.FC
{

    return (
      <>
      <Navbar className="navbar">
        <Container className="text-center">
          <Navbar.Brand as={Link} to='/'>henkie pong</Navbar.Brand>
        </Container>
      </Navbar>
      <Container className="offwhite-bg">
      <Row className='pt-5 pb-4 text-center profile-header'>
        <Col>
        <Container style={{
                maxWidth: 500,
              }}>
        Page not found
        </Container>
        </Col>
      </Row>
      </Container>
      </>
    );
}

export default NotFound;