import { useState, useEffect } from "react";
import { Heart, MessageCircle, MoreHorizontal, Trash2, Edit2, X, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import {
    updateDoc,
    doc,
    arrayUnion,
    arrayRemove,
    collection,
    addDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    deleteDoc
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export default function Post({ post }) {
    const { user } = useAuth();
    const [liked, setLiked] = useState(post.likes?.includes(user?.uid));
    const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [showComments, setShowComments] = useState(false);

    // Edit/Delete state
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editCaption, setEditCaption] = useState(post.caption);

    const isOwner = user?.uid === post.userId;

    // Real-time comments listener
    useEffect(() => {
        const q = query(
            collection(db, "posts", post.id, "comments"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubscribe();
    }, [post.id]);

    const handleLike = async () => {
        if (!user) return;

        const postRef = doc(db, "posts", post.id);
        if (liked) {
            await updateDoc(postRef, {
                likes: arrayRemove(user.uid)
            });
            setLiked(false);
            setLikesCount(prev => prev - 1);
        } else {
            await updateDoc(postRef, {
                likes: arrayUnion(user.uid)
            });
            setLiked(true);
            setLikesCount(prev => prev + 1);
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        await addDoc(collection(db, "posts", post.id, "comments"), {
            text: newComment,
            userId: user.uid,
            username: user.displayName || "User",
            createdAt: serverTimestamp()
        });

        setNewComment("");
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        try {
            await deleteDoc(doc(db, "posts", post.id));
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post");
        }
    };

    const handleUpdate = async () => {
        try {
            await updateDoc(doc(db, "posts", post.id), {
                caption: editCaption
            });
            setIsEditing(false);
            setShowMenu(false);
        } catch (error) {
            console.error("Error updating post:", error);
            alert("Failed to update post");
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg mb-6 overflow-hidden">
            {/* Header */}
            <div className="p-4 flex items-center gap-3 relative">
                <div className="w-8 h-8 bg-gray-700 rounded-full overflow-hidden">
                    {post.user?.photoURL ? (
                        <img src={post.user.photoURL} alt={post.user.username} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                            {post.user?.username?.[0]?.toUpperCase()}
                        </div>
                    )}
                </div>
                <Link to={`/profile/${post.userId}`} className="font-bold hover:underline">
                    {post.user?.username}
                </Link>
                <span className="text-gray-500 text-sm ml-auto mr-8">
                    {post.createdAt?.seconds ? formatDistanceToNow(new Date(post.createdAt.seconds * 1000), { addSuffix: true }) : "Just now"}
                </span>

                {/* Owner Menu */}
                {isOwner && (
                    <div className="absolute right-4 top-4">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="text-gray-400 hover:text-white"
                        >
                            <MoreHorizontal size={20} />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-32 bg-gray-800 rounded shadow-lg z-10 border border-gray-700">
                                <button
                                    onClick={() => {
                                        setIsEditing(true);
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center gap-2"
                                >
                                    <Edit2 size={14} /> Edit
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-red-500 flex items-center gap-2"
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Image */}
            <div className="aspect-square bg-black flex items-center justify-center">
                <img src={post.imageUrl} alt="Post" className="max-h-full max-w-full object-contain" />
            </div>

            {/* Actions */}
            <div className="p-4">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={handleLike}
                        className={`transition-colors ${liked ? "text-red-500" : "text-white hover:text-gray-300"}`}
                    >
                        <Heart size={24} fill={liked ? "currentColor" : "none"} />
                    </button>
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className="text-white hover:text-gray-300"
                    >
                        <MessageCircle size={24} />
                    </button>
                </div>

                <div className="font-bold mb-2">{likesCount} likes</div>

                {/* Caption Section */}
                <div className="mb-2">
                    <span className="font-bold mr-2">{post.user?.username}</span>
                    {isEditing ? (
                        <div className="mt-2">
                            <textarea
                                value={editCaption}
                                onChange={(e) => setEditCaption(e.target.value)}
                                className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-sm focus:outline-none focus:border-blue-500"
                                rows={2}
                            />
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={handleUpdate}
                                    className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 flex items-center gap-1"
                                >
                                    <Check size={12} /> Save
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditCaption(post.caption);
                                    }}
                                    className="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 flex items-center gap-1"
                                >
                                    <X size={12} /> Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <span>{post.caption}</span>
                    )}
                </div>

                {/* Comments Section */}
                {comments.length > 0 && (
                    <div className="mb-2">
                        <button
                            onClick={() => setShowComments(!showComments)}
                            className="text-gray-500 text-sm"
                        >
                            {showComments ? "Hide comments" : `View all ${comments.length} comments`}
                        </button>
                    </div>
                )}

                {showComments && (
                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                        {comments.map(comment => (
                            <div key={comment.id} className="text-sm">
                                <span className="font-bold mr-2">{comment.username}</span>
                                <span>{comment.text}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Comment */}
                <form onSubmit={handleComment} className="flex items-center gap-2 mt-4 border-t border-gray-800 pt-4">
                    <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 bg-transparent focus:outline-none text-sm"
                    />
                    <button
                        type="submit"
                        disabled={!newComment.trim()}
                        className="text-blue-500 font-bold text-sm disabled:opacity-50"
                    >
                        Post
                    </button>
                </form>
            </div>
        </div>
    );
}
