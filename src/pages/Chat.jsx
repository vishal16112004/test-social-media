import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    collection, query, where, orderBy, onSnapshot,
    addDoc, serverTimestamp, doc, getDoc, setDoc,
    updateDoc, deleteDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Send, Trash2, MessageCircle, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Chat() {
    const { chatId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [chats, setChats] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [activeChat, setActiveChat] = useState(null);
    const [loading, setLoading] = useState(true);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const messagesEndRef = useRef(null);

    // Fetch user's chats
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "chats"),
            where("participants", "array-contains", user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const chatsData = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
                const data = docSnapshot.data();
                const otherUserId = data.participants.find(id => id !== user.uid);

                // Fetch other user's details
                let otherUser = { username: "User", photoURL: "" };
                if (otherUserId) {
                    const userDoc = await getDoc(doc(db, "users", otherUserId));
                    if (userDoc.exists()) {
                        otherUser = userDoc.data();
                    }
                }

                return {
                    id: docSnapshot.id,
                    ...data,
                    otherUser,
                    otherUserId // Store ID for filtering suggestions
                };
            }));
            // Sort client-side to avoid composite index requirement
            chatsData.sort((a, b) => b.updatedAt?.seconds - a.updatedAt?.seconds);
            setChats(chatsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Fetch suggestions (followers/following not in active chats)
    useEffect(() => {
        async function fetchSuggestions() {
            if (!user || loading) return;

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (!userDoc.exists()) return;

                const userData = userDoc.data();
                const following = userData.following || [];
                const followers = userData.followers || [];

                // Combine unique IDs
                const allRelatedIds = [...new Set([...following, ...followers])];

                // Filter out users already in chats
                const existingChatUserIds = chats.map(c => c.otherUserId);
                const potentialChatIds = allRelatedIds.filter(id => !existingChatUserIds.includes(id) && id !== user.uid);

                if (potentialChatIds.length === 0) {
                    setSuggestedUsers([]);
                    return;
                }

                // Fetch details for suggested users
                // Firestore 'in' query is limited to 10, so we'll fetch individually for simplicity or slice
                // For a real app, we'd batch or paginate. Here we'll take top 10.
                const idsToFetch = potentialChatIds.slice(0, 10);
                const suggestions = await Promise.all(idsToFetch.map(async (id) => {
                    const docSnap = await getDoc(doc(db, "users", id));
                    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
                }));

                setSuggestedUsers(suggestions.filter(Boolean));
            } catch (error) {
                console.error("Error fetching suggestions:", error);
            }
        }

        fetchSuggestions();
    }, [user, chats, loading]);

    // Fetch messages for active chat
    useEffect(() => {
        if (!chatId) {
            setActiveChat(null);
            return;
        }

        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            setActiveChat(chat);
            // Reset unread count for current user
            if (chat.unreadCounts?.[user.uid] > 0) {
                const unreadCounts = { ...chat.unreadCounts, [user.uid]: 0 };
                updateDoc(doc(db, "chats", chatId), { unreadCounts });
            }
        }

        const q = query(
            collection(db, "chats", chatId, "messages")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            msgs.sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);
            setMessages(msgs);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [chatId, chats]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !chatId || !user) return;

        try {
            const messageData = {
                text: newMessage,
                senderId: user.uid,
                createdAt: serverTimestamp(),
                read: false
            };

            // Add message to subcollection
            await addDoc(collection(db, "chats", chatId, "messages"), messageData);

            // Update chat document with last message and unread count
            const chatDoc = await getDoc(doc(db, "chats", chatId));
            const chatData = chatDoc.data();
            const recipientId = chatData.participants.find(id => id !== user.uid);

            const unreadCounts = chatData.unreadCounts || {};
            unreadCounts[recipientId] = (unreadCounts[recipientId] || 0) + 1;

            await updateDoc(doc(db, "chats", chatId), {
                lastMessage: messageData,
                updatedAt: serverTimestamp(),
                unreadCounts
            });

            setNewMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!confirm("Delete this message?")) return;
        try {
            await deleteDoc(doc(db, "chats", chatId, "messages", messageId));
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    };

    const startChat = async (targetUserId) => {
        try {
            // Check if chat already exists (double check)
            const existingChat = chats.find(c => c.otherUserId === targetUserId);
            if (existingChat) {
                navigate(`/chat/${existingChat.id}`);
                return;
            }

            // Create new chat
            const newChatRef = await addDoc(collection(db, "chats"), {
                participants: [user.uid, targetUserId],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            navigate(`/chat/${newChatRef.id}`);
        } catch (error) {
            console.error("Error starting chat:", error);
        }
    };

    return (
        <div className="flex h-full max-w-6xl mx-auto border-x border-gray-800">
            {/* Chat List (Sidebar) */}
            <div className={`w-full md:w-1/3 border-r border-gray-800 flex flex-col ${chatId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-800 font-bold text-xl">Messages</div>
                <div className="flex-1 overflow-y-auto">
                    {/* Active Chats */}
                    {chats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => navigate(`/chat/${chat.id}`)}
                            className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-900 transition-colors ${chatId === chat.id ? "bg-gray-900" : ""}`}
                        >
                            <div className="w-12 h-12 bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
                                {chat.otherUser.photoURL ? (
                                    <img src={chat.otherUser.photoURL} alt={chat.otherUser.username} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-lg font-bold">
                                        {chat.otherUser.username?.[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`truncate ${chat.unreadCounts?.[user.uid] > 0 ? "font-bold text-white" : "font-semibold text-gray-200"}`}>
                                    {chat.otherUser.username}
                                </div>
                                <div className={`text-sm truncate ${chat.unreadCounts?.[user.uid] > 0 ? "font-bold text-white" : "text-gray-500"}`}>
                                    {chat.lastMessage?.senderId === user.uid ? "You: " : ""}
                                    {chat.lastMessage?.text || "Started a chat"}
                                </div>
                            </div>
                            {chat.unreadCounts?.[user.uid] > 0 && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            {chat.updatedAt && (
                                <div className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatDistanceToNow(new Date(chat.updatedAt.seconds * 1000), { addSuffix: false }).replace("about ", "")}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Suggested Users */}
                    {suggestedUsers.length > 0 && (
                        <>
                            <div className="p-4 pb-2 text-gray-500 font-bold text-sm uppercase tracking-wider">Suggested</div>
                            {suggestedUsers.map(suggestedUser => (
                                <div
                                    key={suggestedUser.id}
                                    onClick={() => startChat(suggestedUser.id)}
                                    className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-900 transition-colors"
                                >
                                    <div className="w-12 h-12 bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
                                        {suggestedUser.photoURL ? (
                                            <img src={suggestedUser.photoURL} alt={suggestedUser.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg font-bold">
                                                {suggestedUser.username?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold truncate">{suggestedUser.username}</div>
                                        <div className="text-sm text-gray-500 truncate">
                                            {suggestedUser.displayName || "Suggested for you"}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {chats.length === 0 && suggestedUsers.length === 0 && (
                        <div className="p-4 text-center text-gray-500">No conversations yet</div>
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className={`w-full md:w-2/3 flex flex-col ${!chatId ? 'hidden md:flex' : 'flex'}`}>
                {chatId ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-gray-800 flex items-center gap-3">
                            <button onClick={() => navigate("/chat")} className="md:hidden text-gray-400">
                                <ArrowLeft />
                            </button>
                            {activeChat && (
                                <>
                                    <div className="w-8 h-8 bg-gray-700 rounded-full overflow-hidden">
                                        {activeChat.otherUser.photoURL ? (
                                            <img src={activeChat.otherUser.photoURL} alt={activeChat.otherUser.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                                                {activeChat.otherUser.username?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="font-bold">{activeChat.otherUser.username}</div>
                                </>
                            )}
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map(msg => {
                                const isMe = msg.senderId === user.uid;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
                                        <div className={`max-w-[70%] p-3 rounded-2xl ${isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-800 text-white rounded-bl-none"}`}>
                                            <p>{msg.text}</p>
                                            <div className="flex items-center justify-end gap-2 mt-1">
                                                <span className="text-[10px] opacity-70">
                                                    {msg.createdAt?.seconds && formatDistanceToNow(new Date(msg.createdAt.seconds * 1000), { addSuffix: true })}
                                                </span>
                                                {isMe && (
                                                    <button
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-300 hover:text-red-100"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800 flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Message..."
                                className="flex-1 bg-gray-900 border border-gray-800 rounded-full px-4 py-2 focus:outline-none focus:border-blue-500"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="text-blue-500 font-bold p-2 disabled:opacity-50 hover:bg-gray-900 rounded-full"
                            >
                                <Send size={24} />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <MessageCircle size={64} className="mb-4" />
                        <p className="text-xl">Your Messages</p>
                        <p className="text-sm">Send private photos and messages to a friend.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
