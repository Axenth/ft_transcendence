import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import Navbar from "react-bootstrap/Navbar";

interface stateType {
  errorMsg: string,
  otp: string,
}

function SubmitOtp( {setAuth} ): React.FC
{
  // State variables
    const [state, setState] = useState<stateType>({
        errorMsg: '',
        otp:''
    });


    // Set navigate to redirect
    const navigate = useNavigate();

    // Function if param is found on hook bellow
    const submitOtpCode = async function (context: any, intentNumber?: number)
    {
      context.preventDefault();
      //console.log('Trying to submit OTP');

      // Fetch from server auth module
      const res: any = await fetch(`${process.env.REACT_APP_API_URL}:3000/auth/submit2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.sessionStorage.getItem('pongJwtAccessToken')}`,
        },
        body: JSON.stringify({
            otp: context.target[0].value,
        })
      });
      const data: any = await res.json();
      if (!res.ok)
      {
        if (res.status !== 401)
        {
          setState({...state, errorMsg: 'Error: trying to send OTP.'});
        }
        else
        {
          //console.log('On nickname page.. gotta refresh tokens!');
          setAuth(false);
		  setTimeout(() => {
			if (intentNumber !== 3) {
			  submitOtpCode(context, intentNumber ? intentNumber + 1 : 1);
			}
		  }, 2000);
        }
        return ;
      }
      else
      {
        window.sessionStorage.setItem('pongJwtAccessToken', data.access_token);
        document.cookie = `pongJwtRefreshToken=${data.refresh_token}; SameSite=Lax; path=/`;
        setAuth(true);
        navigate('/');
        window.location.reload(false);
      }

    }

    const requestCode = async () => {
      try {
        const res: any = await fetch(`${process.env.REACT_APP_API_URL}:3000/auth/send2facode`, {
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

    useEffect(() => {
      requestCode();
    }, []);



    return (
      <>
      <Navbar className="navbar">
        <Container className="text-center">
          <Navbar.Brand>henkie pong</Navbar.Brand>
        </Container>
      </Navbar>
      <Container className="offwhite-bg">
      <Row className='pt-5 pb-4 text-center profile-header'>
        <Col>
        <Container style={{
                maxWidth: 500,
              }}>
        <Form onSubmit={ submitOtpCode }>
          <Form.Group className="mb-3" controlId="formNickname">
            <Form.Label>Type OTP</Form.Label>
            <Form.Control type="password" placeholder="Enter One-Time Password" value={state.nickname} onChange={(e) => { setState({...state, otp: e.target.value}) }} />
            <Form.Text className="text-muted">
              Check your email for a code
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

export default SubmitOtp;