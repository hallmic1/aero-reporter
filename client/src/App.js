import useWebSocket from "react-use-websocket";
import "./card.css"
import {useEffect, useRef, useState} from "react";
import Section from "./Section";
const WS_URL = 'ws://192.168.4.62:3001';
function App() {
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
  }, []);
  const [data, setData] = useState(null);
  useEffect(() => {
    if(!lastMessage) return;
    console.log(lastMessage.data)
    setData(JSON.parse(lastMessage.data));
  }, [lastMessage]);
  if(!data) return null;
  console.log('data',data);
  return (
    <div className="card-list">
      <Section name="Pumps" list={data.pumps} />
      <Section name="Switches" list={data.switches} />
      <Section name="Peristaltic Pumps" list={data.peristalticPumps} />
    </div>
  );
}

export default App;
