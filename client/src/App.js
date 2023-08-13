import useWebSocket from "react-use-websocket";
import "./card.css"
import {useEffect, useRef, useState} from "react";
import Section from "./Section";
import Alert from "./Alert";
const WS_URL = 'ws://192.168.4.60:3001';

function App() {
  function getHealth() {
    fetch("http://espgarden.local/health").then(res => res.json()).then(data => {
        console.log(data);
      setAlert(data.status !== "OK");
    }).catch(err => {
      console.log(err);
      setAlert(true)
    })
  }
  const didUnmount = useRef(false);
  const {lastMessage} = useWebSocket(WS_URL, {
    shouldReconnect: (closeEvent) => {
      return didUnmount.current === false;
    },
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });
  useEffect(() => {
    return () => {
      didUnmount.current = true;
    }
  }, [])
  const [data, setData] = useState(null);
  const [alert, setAlert] = useState(false);
  useEffect(() => {
    if(!lastMessage) return;
    console.log(lastMessage.data)
    setData(JSON.parse(lastMessage.data));
  }, [lastMessage]);
  useEffect(() => {
    const timer = setTimeout(() => {
      getHealth()
    }, 5000);
    return () => clearTimeout(timer)
  }, [])
  if(!data) return null;
  return (
    <div className="card-list">
      <Alert show={alert} message={"Is your arduino on and connected to the internet?"} />
      <Section name="Pumps" list={data.pumps} />
      <Section name="Switches" list={data.switches} />
      <Section name="Peristaltic Pumps" list={data.peristalticPumps} />
    </div>
  );
}

export default App;
