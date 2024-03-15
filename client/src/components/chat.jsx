import { useContext, useEffect, useRef, useState } from "react";
import Avatar from "./avatar";
import Logo from "./logo";
import { userContext } from "./userContext";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./contact";

export default function Chat() {
    const [ws,setWs] = useState(null) ;
    const [newMessage, setNewMessage] = useState('') ;
    const [messages, setMessages] = useState([]) ;
    const [onlinePeople, setOnlinePeople] = useState({}) ;
    const [offlinePeople, setOfflinePeople] = useState({}) ;

    const [selectedUser, setSelectedUser] = useState(null) ;
    const {username, userId,setUserId, setUsername} = useContext(userContext) ;
    const divUnderMsg = useRef();
    
    useEffect(() => {
        connectToWs() ;
    }, []) ;

    function connectToWs(){
        //const ws = new WebSocket('ws://localhost:4040/api') ;
        const ws = new WebSocket('ws://zenith-chatapp.vercel.app/api') ;
        setWs(ws) ;
        ws.addEventListener('message', handleMessage) ;
        ws.addEventListener('close', () => {
            setTimeout(()=> {
                console.log("Disconnected . Trying to reconnect .")
                connectToWs() ;
            }, 1000) ;
        }) ;
    }

    useEffect(()=> {
        const div = divUnderMsg.current ;
        if(div){
            div.scrollIntoView({behavior:'smooth', block:'end'})
        }
    }, [messages]) ;

    useEffect(() => {
        axios.get('/people').then(res => {
            const offlinePeopleArr = res.data
                                    .filter(p => p._id !== userId)
                                    .filter(p => !Object.keys(onlinePeople).includes(p._id));
            // console.log(offlinePeople) ;
            const offlinePeople = {} ;
            offlinePeopleArr.forEach(p => {
                offlinePeople[p._id] = p ;
            }) ;
            setOfflinePeople(offlinePeople) ;
        } ) ;
        

    }, [onlinePeople])

    useEffect(() => {
      if(selectedUser){
        axios.get('/messages/'+selectedUser).then(res => {
            setMessages(res.data) ;
        }
        ) ;
      }
    
    }, [selectedUser])
    


    function showOnlinePeople(peopleArray){
        const people = {} ;
        peopleArray.forEach(({userId,username}) => {
            people[userId] = username ;
        });

        setOnlinePeople(people) ;
        
    }

    async function handleMessage(e){
        const messageData = JSON.parse(e.data) ;
        //console.log(messageData) ;
        if('online' in messageData){
            showOnlinePeople(messageData.online) ;
        } else if ('text' in messageData) {
            console.log({messageData}) ;
            if(messageData.sender === selectedUser || messageData.sender === userId) {
                setMessages(prev => ([...prev,{...messageData,isOur:false}])) ;
            }
        }
    }

    async function sendMessage(e,file=null){
        if(e) e.preventDefault() ;
        
        await ws.send(JSON.stringify({
            recipient:selectedUser,
            text:newMessage,
            file
        })) ;

        if(file) {
            setTimeout(() => {
                axios.get('/messages/'+ selectedUser ).then( res => {
                    setMessages(res.data) ;
                }) ;
            }, 1000)
        }else {
            setNewMessage('') ;
            setMessages(prev => ([...prev,{
                text:newMessage, 
                isOur:true, 
                sender: userId, 
                recipient: selectedUser, 
                _id:Date.now()
            }])) ;
        }

        console.log({messages}) ;
    } 

    async function sendFile(e){
        const reader = new FileReader() ;
        reader.readAsDataURL(e.target.files[0]) ;
        console.log(e) ;
        reader.onload = () => {
            sendMessage(null, {
                name: e.target.files[0].name,
                data : reader.result,
            }) ;
        }
        
    }

    function logout() {
        axios.post('/logout').then(() => {
            setUsername(null) ;
            setUserId(null) ;
            setWs(null) ;
        }) ;
    }

    const onlinePeopleExclOurUser = {...onlinePeople} ;
    delete onlinePeopleExclOurUser[userId] ;

    const messagesWithoutDupes = uniqBy(messages, '_id') ;


    return(
        <div className="flex h-screen w-screen">

            <div className="w-1/3 bg-gray-300 flex flex-col">
                <div className="flex-grow overflow-y-scroll">
                    <Logo />
                    <div>
                    {Object.keys(onlinePeopleExclOurUser).map(userId => (
                        <Contact 
                            key={userId}
                            userId={userId}
                            username={onlinePeopleExclOurUser[userId]}
                            onClick={()=> setSelectedUser(userId)}
                            selected={userId === selectedUser} 
                            online={true} 
                            />
                        ))}

                        {Object.keys(offlinePeople).map(userId => (
                        <Contact 
                            key={userId}
                            userId={userId}
                            username={offlinePeople[userId].username}
                            onClick={()=> setSelectedUser(userId)}
                            selected={userId === selectedUser} 
                            online={false} 
                            />
                        ))}
                    </div>
                </div>

                    <div className=" text-center justify-center flex mt-3 mb-1 items-center"> 
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>

                                {username}

                            <span className="bg-red-300 flex rounded-md px-2 py-1 ml-1.5">
                                
                                <button type="button" onClick={logout} >
                                    Logout
                                </button>
                            </span>
                                
                    </div>
            </div> 

            <div className="w-2/3 flex flex-col bg-blue-200 pb-2.5">
            
                {!selectedUser && (
                    <div className="flex flex-grow items-center justify-center pl-2 font-mono">
                        &larr; Select a user to open chat
                    </div>
                )}  

                {!!selectedUser && (
                        <div className="relative h-full mx-2">
                            <div className="absolute pl-2 font-mono w-full overflow-y-scroll my-2 top-0 left-0 right-0 bottom-2">
                                {messagesWithoutDupes.map(m => (
                                    <div key={m._id} className={" " +(m.sender === userId ? "text-right mr-2" : "text-left")}>
                                        <div className={"text-left inline-block rounded-md p-1 px-2 m-2 "+(m.sender === userId ? " bg-blue-100" : " bg-white")}>
                                                {m.text}
                                                {m.file && (
                                                    <div> 
                                                        <a target="_blank" className="border-b flex items-center gap-1" href={m.file} > 
                                                        {/*in href u can have axios.defaults.baseURL + 'uploads/' + m.file.split('/')[m.file.split('/').length - 1]... for local image if saving in uplods in localhost  */}
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 p-0.5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                                            </svg>
                                                            {/*img-filename ....{m.file.split('/')[m.file.split('/').length - 1]}*/}
                                                            <img src={m.file} className="w-30 h-7 rounded-md border-white" ></img>
                                                        </a>
                                                    </div>
                                                )}
                                        </div>

                                    </div>
                                ))}
                                <div ref={divUnderMsg} > </div>
                            </div>
                        </div>
                )}

                {!!selectedUser && (
                    <div>
                        <form className="flex gap-1 w-full pr-1" onSubmit={sendMessage}>
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    className="flex-grow pl-2 ml-1 rounded-md" 
                                    placeholder="type message here ..." 
                                />  

                                <label 
                                    className="bg-blue-300 rounded-md cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 p-0.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                    </svg>

                                    <input
                                        hidden={true}
                                        type="file"
                                        onChange={sendFile}
                                    />
                                </label>

                                <button 
                                    type='submit'
                                    className="bg-blue-400 rounded-full cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 p-0.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                    </svg>
                                </button>

                        </form>
                    </div>
                )}

            </div>
        </div>
    ) ;
}