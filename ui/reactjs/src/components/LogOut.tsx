import React, { useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import genericFetch from "../utils/genericFetch.ts";

function LogOut(): React.FC {
	// Set navigate to redirect
	const navigate = useNavigate();

	const { setAuthenticated, sockets } = useOutletContext();


	const disconnectSockets = () => {
		sockets.pong.disconnect();
		sockets.chat.disconnect();
		console.log("Reached disconnect");
	};

	useEffect(function () {
		const fetchLogOut = genericFetch;
		const fetchData = async function (intentNumber?: number) {
			try {
				const data = await fetchLogOut(
					`${process.env.REACT_APP_API_URL}:3000/auth/logout`,
					"POST"
				);
				if (!data) {
					setAuthenticated(false);
					setTimeout(() => {
						if (intentNumber !== 3) {
						  fetchData(intentNumber ? intentNumber + 1 : 1);
						}
					  }, 2000);
				} else {
					window.sessionStorage.removeItem("pongJwtAccessToken");
					document.cookie = `pongJwtRefreshToken=; SameSite=Lax; path=/`;
					disconnectSockets();
					navigate("/login");
				}
			} catch (e) {
				//console.log(e);
			}
		};

		fetchData();
	}, []);
	return <>Logging out</>;
}

export default LogOut;
