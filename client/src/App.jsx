import axios from 'axios' ;
import UserContextProvider from "./components/userContext";
import Routes from "./components/routes";

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL ;
axios.defaults.withCredentials = true ;

export default function App() {

  return (
    <UserContextProvider>
      <Routes />
    </UserContextProvider>
      
  );
}

