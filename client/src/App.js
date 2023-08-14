import useWebSocket from "react-use-websocket";
import "./card.css"
import {useEffect, useRef, useState} from "react";
import Section from "./Section";
import Alert from "./Alert";
const WS_URL = '192.168.4.62:3001';
const errorCodes = {
  SERVER_DEAD: "Have you started your server?",
  ARDUINO_DEAD: "Is your arduino on and connected to the internet?",
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);

  return response;
}
function App() {

  const [data, setData] = useState(null);
  const [alert, setAlert] = useState([]);
  const didUnmount = useRef(false);
  const {lastMessage} = useWebSocket(`ws://${WS_URL}`, {
    shouldReconnect: () => {
      return didUnmount.current === false;
    },
    reconnectAttempts: 10,
    retryOnError: true,
    reconnectInterval: 3000,
    onError: () => {
      if(!alert.includes(errorCodes.SERVER_DEAD)) {
        setAlert([...alert, errorCodes.SERVER_DEAD]);
      }
    },
    onClose: () => {
      if(!alert.includes(errorCodes.SERVER_DEAD)) {
        setAlert([...alert, errorCodes.SERVER_DEAD]);
      }
    },
    onOpen: () => {
      setAlert(alert.filter(e => e !== errorCodes.SERVER_DEAD));
    }
  });
  useEffect(() => {
    return () => {
      didUnmount.current = true;
    }
  }, [])

  useEffect(() => {
    if(!lastMessage) return;
    setData(JSON.parse(lastMessage.data));
  }, [lastMessage]);
  useEffect(() => {
    const timer = setInterval(() => {
      getHealth()
    }, 5000);
    return () => clearTimeout(timer)
  }, [])
  function getHealth() {
    fetchWithTimeout("http://espgarden.local/health", {timeout: 5000}).then(res => res.json()).then(data => {
      if(data.status !== "OK") {
        if(!alert.includes(errorCodes.ARDUINO_DEAD)) {
          setAlert([...alert, errorCodes.ARDUINO_DEAD]);
        }
      } else {
        setAlert(alert.filter(e => e !== errorCodes.ARDUINO_DEAD));
      }
    }).catch(err => {
      console.log(err);
      if(!alert.includes(errorCodes.ARDUINO_DEAD)) {
        setAlert([...alert, errorCodes.ARDUINO_DEAD]);
      }
    })
    fetchWithTimeout(`http://${WS_URL}/health`, {timeout: 5000}).then(res => res.json()).then(data => {
      if(data.status !== "OK") {
        if(!alert.includes(errorCodes.SERVER_DEAD)) {
          setAlert([...alert, errorCodes.SERVER_DEAD]);
        }
      } else {
        setAlert(alert.filter(e => e !== errorCodes.SERVER_DEAD));
      }
    }).catch(err => {
      console.log(err);
      if(!alert.includes(errorCodes.SERVER_DEAD)) {
        setAlert([...alert, errorCodes.SERVER_DEAD]);
      }
    })
  }

  if(!data) return null;
  return (
    <div className="card-list">
      <Alert show={alert.length > 0} message={alert.join('\/n')} />
      <Section name="Pumps" list={data.pumps} />
      <Section name="Switches" list={data.switches} />
      <Section name="Peristaltic Pumps" list={data.peristalticPumps} />
    </div>
  );
}

export default App;
