import Avatar from "./avatar";
export default function Contact({userId, onClick, selected, username, online }) {
    return(
        <div 
                            onClick={()=> onClick(userId)} 
                            key={userId} 
                            className={"flex gap-2 cursor-pointer items-center border-b border-gray-200 "+ (selected ? "bg-gray-200": "")}>
                            {selected && (
                                <div className="w-1 h-8 bg-red-300 rounded-r-md "> 
                                </div>
                            )}
                            <div className="pl-2 mb-1 flex gap-2 items-center">
                                <Avatar 
                                    online={online} 
                                    //username={onlinePeopleExclOurUser[userId]} 
                                    username={username}
                                    userId={userId} />
                                {username}
                            </div>
        </div>
    ) ;
}