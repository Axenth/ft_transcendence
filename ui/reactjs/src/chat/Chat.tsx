import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import './style.Chat.css';
import ChatWindow from './components/ChatWindow.tsx';
import { CreateRoom, JoinRoom,  PublicRoomList, PrivateRoomList, LeaveRoom } from './components/TabRooms.tsx';
import { TabGame } from './components/TabGame.tsx';
import { FriendList } from '../friendlist/FriendList.tsx';
import { RoomInfo } from './components/TabRoomInfo.tsx';


function Chat(): React.FC
{
	const { setAuthenticated, sockets } = useOutletContext();
  	const socket = sockets.chat;

	const fetchChat = async function ()
	{
		//console.log("Fetching user")
		const res = await fetch(`${process.env.REACT_APP_API_URL}:3000/user/getprofile`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${window.sessionStorage.getItem('pongJwtAccessToken')}`,
			},
		});
		const data = await res.json();
		if (res.ok)
		{
			//console.log("Profile received");
			setUser(data.nickname);
		}
		else if (res.status === 401)
		{
			setAuthenticated(false);
			setTimeout( () => { fetchChat(); }, 2000);
		}
	}

	const [user, setUser] = useState<string>("");
	const [currentRoomId, setRoomId] = useState<string>();

	useEffect(function ()
	{
		fetchChat();
	},[]);


	useEffect(function ()
	{
		return () => {
			sockets.chat.emit('leave-chat', currentRoomId);
		}
	},[]);

	useEffect(function ()
	{
		socket.on('join-room-client', (messages, currentRoomId) => {
			setRoomId(currentRoomId);
		});
		return (() => {
			socket.off('join-room-client');
		});
	},[]);

	return (
		<>
		<Container>
			<Row>
				<Col lg={6}>
					<ChatWindow user={user} currentRoomId={(currentRoomId === undefined)? "No room selected" : currentRoomId}></ChatWindow>
				</Col>
				<Col >
					<div className='chatbox-wrapper'>
						<Tabs defaultActiveKey="rooms" transition={false} fill>
							<Tab eventKey="rooms" title="Rooms">
								<div className='rooms-action-block'>
									<CreateRoom user={user}></CreateRoom>
									<JoinRoom user={user}></JoinRoom>
									<LeaveRoom currentRoomId={currentRoomId} currentUser={user} ></LeaveRoom>
								</div>
								<Tabs style={{marginTop: '40px'}}defaultActiveKey="public" transition={false} fill>
									<Tab eventKey="public" title="Public Rooms">
										<PublicRoomList currentRoomId={currentRoomId} user={user}></PublicRoomList>
									</Tab>
									<Tab eventKey="private" title="Private Rooms">
										<PrivateRoomList currentRoomId={currentRoomId} user={user}></PrivateRoomList>
									</Tab>
								</Tabs>
							</Tab>
							<Tab eventKey="game" title="Game">
								<TabGame user={user}></TabGame>
							</Tab>
							<Tab eventKey="info" title="Info">
								<RoomInfo currentRoomId={currentRoomId} user={user}></RoomInfo>
							</Tab>
						</Tabs>
					</div>
				</Col>
				<Col>
				<div className='chatbox-wrapper'>
					<FriendList user={user}></FriendList>
				</div>
				</Col>
			</Row>
			</Container>
		</>
	);
}

export default Chat;
