import { useState } from "react";
import { Edit2 } from "lucide-react";
import { getCoverArt } from "../utils/songHelpers";

export default function UploadedSongsSection({ songs=[] }) {

const [filter,setFilter]=useState("all");

const filteredSongs=songs.filter(song=>{

    if(filter==="all") return true;

    return song.status===filter;

});

return(

<div className="mt-10 bg-[#121212] p-6 rounded-2xl">

<h2 className="text-3xl text-white font-bold mb-5">
🎵 Bài hát đã đăng tải
</h2>

<select
className="bg-[#1e1e1e] p-2 rounded text-white mb-6"
onChange={(e)=>setFilter(e.target.value)}
>

<option value="all">Tất cả</option>
<option value="approved">Đã duyệt</option>
<option value="pending">Chờ duyệt</option>
<option value="rejected">Từ chối</option>

</select>

<div className="space-y-3">

{filteredSongs.map(song=>(

<div
key={song.id}
className="bg-[#1d1d1d] rounded-xl p-4 flex justify-between items-center"
>

<div className="flex gap-4">

<img
src={getCoverArt(song)}
className="w-16 h-16 rounded-lg object-cover"
alt={song.title}
/>

<div>

<h3 className="text-white font-bold">
{song.title}
</h3>

<p className="text-gray-400">
{song.artist}
</p>

<p className="text-sm text-cyan-400">
{song.genre}
</p>

</div>

</div>

<div className="flex gap-3 items-center">

<span className="text-cyan-400">
{song.status}
</span>

<button
className="bg-cyan-500 p-2 rounded-full"
>
<Edit2 size={18}/>
</button>

</div>

</div>

))}

</div>

</div>

)

}