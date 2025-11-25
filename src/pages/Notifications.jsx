import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function Notifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "notifications"),
            where("recipientId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort client-side to avoid composite index requirement
            data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
            setNotifications(data);
            setLoading(false);

            // Mark unread notifications as read
            const unreadNotifications = snapshot.docs.filter(doc => !doc.data().read);
            unreadNotifications.forEach(docSnapshot => {
                updateDoc(doc(db, "notifications", docSnapshot.id), { read: true });
            });
        });

        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full mt-10">
                <Loader2 className="animate-spin text-white" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Notifications</h1>

            {notifications.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                    <p>No new notifications.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map(notification => (
                        <div key={notification.id} className="flex items-center gap-4 bg-gray-900 p-4 rounded-lg border border-gray-800">
                            <Link to={`/profile/${notification.senderId}`} className="flex-shrink-0">
                                <div className="w-10 h-10 bg-gray-700 rounded-full overflow-hidden">
                                    {notification.sender?.photoURL ? (
                                        <img src={notification.sender.photoURL} alt={notification.sender.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                                            {notification.sender?.username?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </Link>

                            <div className="flex-1">
                                <p className="text-sm">
                                    <Link to={`/profile/${notification.senderId}`} className="font-bold mr-1 hover:underline">
                                        {notification.sender?.username}
                                    </Link>
                                    {notification.type === "follow" ? "started following you." :
                                        notification.type === "comment" ? "commented on your post." :
                                            notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {notification.createdAt?.seconds ? formatDistanceToNow(new Date(notification.createdAt.seconds * 1000), { addSuffix: true }) : "Just now"}
                                </p>
                            </div>

                            {notification.type === "comment" && notification.postId && (
                                <Link to={`/`} className="text-blue-500 text-sm font-bold hover:underline">
                                    View Post
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
