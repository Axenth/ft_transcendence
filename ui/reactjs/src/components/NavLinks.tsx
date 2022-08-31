import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Image from "react-bootstrap/Image";
import genericFetch from "../utils/genericFetch.ts";

interface navLinksType {
	name: string,
	avatar: string,
}

function NavLinks( {setAuthenticated} ): React.FC {
	const [user, setUser] = useState<navLinksType>({
		name: "",
		avatar: "",
	});


	useEffect(function (){
		const fetchProfile = genericFetch;
    	const fetchData = async function (intentNumber?: number) {
    	  try {
    	    const data = await fetchProfile(
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
    	      setUser({
    	        ...user,
				name: data.nickname,
				avatar: data.avatar,
    	      });
    	    }
    	  } catch (e) {
    	    //console.log(e);
    	  }
    	};

    	fetchData();
	}, []);

	return (
        <Navbar className="navbar" expand="lg">
			<Container>
				<Navbar.Brand as={Link} to='/'>henkie pong</Navbar.Brand>
				<Navbar.Toggle aria-controls="basic-navbar-nav" />
				<Navbar.Collapse id="basic-navbar-nav">
					<Nav className="me-auto">
						<Nav.Link as={Link} to='/chat'>chat</Nav.Link>
						<Nav.Link as={Link} to='/'>profile</Nav.Link>
						<Nav.Link as={Link} to='/settings'>settings</Nav.Link>
						<Nav.Link as={Link} to='/user/logout'>logout</Nav.Link>
					</Nav>
				</Navbar.Collapse>
				<Navbar.Brand >
					<div className='wrapper-nav-bar-user'>
						<div className='nav-bar-user'>
							{user.name}
						</div>
						<Image
              				width="30px"
              				height="30px"
             				 roundedCircle={true}
              				src={user.avatar}
            			/>
					</div>
				</Navbar.Brand>
			</Container>
    	</Navbar>
  	);
}

export default NavLinks;
