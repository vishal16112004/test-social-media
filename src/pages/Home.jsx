import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import Post from "../components/Post";
import { Loader2 } from "lucide-react";

export default function Home() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin text-white" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto py-8 px-4">
            {posts.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                    <p className="text-xl mb-4">No posts yet</p>
                    <p>Follow some users or create a post to get started!</p>
                </div>
            ) : (
                posts.map(post => (
                    <Post key={post.id} post={post} />
                ))
            )}
        </div>
    );
}
