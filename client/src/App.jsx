import axios from 'axios' ;
import UserContextProvider from "./components/userContext";
import Routes from "./components/routes";

export default function App() {

  axios.defaults.baseURL = 'http://localhost:4040/' ;
  axios.defaults.withCredentials = true ;

  return (
    <UserContextProvider>
      <Routes />
    </UserContextProvider>
      
  );
}

