async function genericFetch(endpoint: string, type: string, body?: string) {
  try {
    let res;
    if (!body) {
      res = await fetch(endpoint, {
        method: type,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${window.sessionStorage.getItem(
            "pongJwtAccessToken"
          )}`,
        },
      });
    } else {
      res = await fetch(endpoint, {
        method: type,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${window.sessionStorage.getItem(
            "pongJwtAccessToken"
          )}`,
        },
        body: JSON.stringify(body),
      });
    }
    if (!res) {
      document.cookie = "pongJwtRefreshToken=; SameSite=Lax; path=/";
      window.sessionStorage.removeItem("pongJwtAccessToken");
      return false;
    }
    const data = await res.json();
    if (res.ok) {
      return data;
    }
    return false;
  } catch (e) {
    throw e;
  }
}

export default genericFetch;
