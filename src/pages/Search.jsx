import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link } from "react-router-dom";
import { Search as SearchIcon, Loader2 } from "lucide-react";

export default function Search() {
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const searchUsers = async () => {
            if (!searchTerm.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const q = query(
                    collection(db, "users"),
                    where("username", ">=", searchTerm.toLowerCase()),
                    where("username", "<=", searchTerm.toLowerCase() + '\uf8ff')
                );

                const querySnapshot = await getDocs(q);
                const users = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setResults(users);
            } catch (error) {
                console.error("Error searching users:", error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            searchUsers();
        }, 500); // Debounce search

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    return (
        <div className="max-w-xl mx-auto p-4">
            <div className="relative mb-6">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 p-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:outline-none focus:border-blue-500"
                />
            </div>

            {loading && (
                <div className="flex justify-center my-4">
                    <Loader2 className="animate-spin text-gray-500" />
                </div>
            )}

            <div className="space-y-4">
                {results.map(user => (
                    <Link
                        key={user.uid}
                        to={`/profile/${user.uid}`}
                        className="flex items-center gap-4 p-3 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <div className="w-12 h-12 bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt={user.username} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg font-bold">
                                    {user.username?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="font-bold">{user.username}</div>
                            <div className="text-gray-400 text-sm">{user.displayName}</div>
                        </div>
                    </Link>
                ))}

                {searchTerm && !loading && results.length === 0 && (
                    <div className="text-center text-gray-500">
                        No users found
                    </div>
                )}
            </div>
        </div>
    );
}
