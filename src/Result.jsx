import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';
import supabase from './supabaseClient';

const Result = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [topArtists, setTopArtists] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasFetchedResponse, setHasFetchedResponse] = useState(false);

  const navigate = useNavigate();
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Util untuk ambil token
  const getAccessToken = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.provider_token) {
      throw new Error('Access token not available');
    }
    return session.provider_token;
  };

  const getTopArtists = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch('https://api.spotify.com/v1/me/top/artists?limit=5&time_range=medium_term', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Spotify error ${res.status}`);
      const data = await res.json();
      setTopArtists(data.items || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const getTopTracks = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=short_term', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Spotify error ${res.status}`);
      const data = await res.json();
      setTopTracks(data.items || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const getResponse = useCallback(async () => {
    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `User's top artists are ${topArtists.map(a => a.name).join(', ')} and top tracks are ${topTracks.map(t => `${t.name}-${t.artists[0].name}`).join(', ')}.`,
        config: {
          systemInstruction: `... (instructions tetap sama, tidak diubah) ...`
        }
      });
      setResponse(result.text);
    } catch (err) {
      setError("Failed to generate AI response");
    }
  }, [topArtists, topTracks]);

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user?.user_metadata || null);
      setLoading(false);
    };
    loadSession();
  }, []);

  useEffect(() => {
    if (!loading && session && session.provider_token && topArtists.length === 0) {
      getTopArtists();
      getTopTracks();
    }
  }, [loading, session, getTopArtists, getTopTracks]);

  useEffect(() => {
    if (!hasFetchedResponse && topArtists.length > 0 && topTracks.length > 0) {
      setHasFetchedResponse(true);
      getResponse();
    }
  }, [topArtists, topTracks, hasFetchedResponse, getResponse]);

  // Mengetik animasi
  useEffect(() => {
    if (response) {
      setIsTyping(true);
      let charIndex = 0;
      const typeChar = () => {
        setDisplayText(response.slice(0, charIndex + 1));
        charIndex++;
        if (charIndex < response.length) {
          setTimeout(typeChar, 30);
        } else {
          setIsTyping(false);
        }
      };
      typeChar();
    }
  }, [response]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const paragraphs = useMemo(() => displayText.split('\n\n'), [displayText]);

  if (loading || topArtists.length === 0 || topTracks.length === 0) {
    return (
      <div className="header result-bg flex flex-col items-center justify-center min-h-screen p-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto" />
          <h2 className="text-xl font-bold">Analyzing your music taste...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="header result-bg flex items-center justify-center min-h-screen p-10">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Oops! Something went wrong</h2>
          <p className="mb-4 text-sm">{error}</p>
          <button onClick={handleLogout} className="border-2 border-white px-4 py-2 rounded-full text-sm hover:bg-white hover:text-black">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="header result-bg flex flex-col items-center justify-center min-h-screen p-10">
      <div className="max-w-4xl text-center">
        <h1 className="font-bold text-2xl mb-4">{user?.name || user?.display_name}, here's your result</h1>
        <div className="description mb-8 px-10 text-sm text-left space-y-4">
          {isTyping ? (
            <div className="animate-pulse">Generating your description...</div>
          ) : (
            paragraphs.map((p, i) => <p key={i}>{p}</p>)
          )}
        </div>
      </div>

      <div className="flex flex-col items-start gap-12">
        <div className="flex gap-6 items-start">
          {topArtists[0]?.images?.[0]?.url && (
            <img src={topArtists[0].images[0].url} className="w-40 h-40 object-cover" alt="Top artist" />
          )}
          <div>
            <h2 className="font-bold text-xl mb-2">Top Artists</h2>
            <ol className="text-left text-sm space-y-1">
              {topArtists.map((a, i) => (
                <li key={a.id || i}><span className="font-medium">{i + 1}.</span> {a.name}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {topTracks[0]?.album?.images?.[0]?.url && (
            <img src={topTracks[0].album.images[0].url} className="w-40 h-40 object-cover" alt="Top track" />
          )}
          <div>
            <h2 className="font-bold text-xl mb-2">Top Tracks</h2>
            <ol className="text-left text-sm space-y-1">
              {topTracks.map((t, i) => (
                <li key={t.id || i}><span className="font-medium">{i + 1}.</span> {t.name}</li>
              ))}
            </ol>
          </div>
        </div>

        <button onClick={handleLogout} className="mt-6 text-sm font-bold border-2 border-white rounded-full px-3 py-2 hover:bg-white hover:text-black transition-colors">
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Result;
