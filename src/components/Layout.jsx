import { Link, useLocation } from "react-router-dom";
import { Home, Search, PlusSquare, Heart, User, LogOut, MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";

export default function Layout({ children }) {
    const { pathname } = useLocation();
    const { user } = useAuth();

    const navItems = [
        { icon: Home, label: "Home", path: "/" },
        { icon: Search, label: "Search", path: "/search" },
        { icon: PlusSquare, label: "Create", path: "/create" },
        { icon: MessageCircle, label: "Messages", path: "/chat" },
        { icon: Heart, label: "Notifications", path: "/notifications" },
        { icon: User, label: "Profile", path: `/profile/${user?.uid}` },
    ];

    return (
        <div className="flex h-screen bg-black text-white">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 border-r border-gray-800 p-4">
                <h1 className="text-2xl font-bold mb-8 px-4">Instagram</h1>
                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-900 transition-colors ${pathname === item.path ? "font-bold" : ""
                                }`}
                        >
                            <item.icon size={24} />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <button
                    onClick={() => auth.signOut()}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-900 transition-colors text-red-500"
                >
                    <LogOut size={24} />
                    <span>Logout</span>
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>

            {/* Bottom Bar (Mobile) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 flex justify-around p-3 z-50">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`p-2 ${pathname === item.path ? "text-white" : "text-gray-500"}`}
                    >
                        <item.icon size={24} />
                    </Link>
                ))}
            </nav>
        </div>
    );
}
