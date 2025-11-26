import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, Search, Compass, Video, Heart, PlusSquare, User, LogOut, Instagram, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../lib/firebase";

export default function Layout({ children }) {
    const { pathname } = useLocation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        // Chat listener
        const qChats = query(
            collection(db, "chats"),
            where("participants", "array-contains", user.uid)
        );

        const unsubscribeChats = onSnapshot(qChats, (snapshot) => {
            let count = 0;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.unreadCounts?.[user.uid]) {
                    count += data.unreadCounts[user.uid];
                }
            });
            setUnreadCount(count);
        });

        // Notifications listener
        const qNotifications = query(
            collection(db, "notifications"),
            where("recipientId", "==", user.uid),
            where("read", "==", false)
        );

        const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
            setUnreadNotificationsCount(snapshot.size);
        });

        return () => {
            unsubscribeChats();
            unsubscribeNotifications();
        };
    }, [user]);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate("/login");
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    const navItems = [
        { icon: Home, label: "Home", path: "/" },
        { icon: Search, label: "Search", path: "/search" },
        { icon: Compass, label: "Explore", path: "/explore" },
        { icon: Video, label: "Reels", path: "/reels" },
        {
            icon: MessageCircle,
            label: "Messages",
            path: "/chat",
            badge: unreadCount > 0 ? unreadCount : null
        },
        {
            icon: Heart,
            label: "Notifications",
            path: "/notifications",
            badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null
        },
        { icon: PlusSquare, label: "Create", path: "/create" },
        { icon: User, label: "Profile", path: `/profile/${user?.uid}` },
    ];

    return (
        <div className="flex h-screen bg-black text-white">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 border-r border-gray-800 p-4">
                <h1 className="text-2xl font-bold mb-8 px-4 italic">Instagram</h1>
                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            to={item.path}
                            className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-900 transition-colors ${pathname === item.path ? "font-bold" : ""}`}
                        >
                            <div className="relative">
                                <item.icon size={24} />
                                {item.badge && (
                                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                        {item.badge}
                                    </div>
                                )}
                            </div>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-900 transition-colors text-red-500"
                >
                    <LogOut size={24} />
                    <span>Logout</span>
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                {children}
            </main>

            {/* Bottom Bar (Mobile) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 flex justify-around p-3 z-50">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        to={item.path}
                        className={`p-2 relative ${pathname === item.path ? "text-white" : "text-gray-500"}`}
                    >
                        <item.icon size={24} />
                        {item.badge && (
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                {item.badge}
                            </div>
                        )}
                    </Link>
                ))}
            </nav>
        </div>
    );
}
