/**
 * Built-in royalty-free music library.
 * Tracks are served locally from /public/music/ — same origin, no CORS issues.
 * Each track is ~1MB (~60s of instrumental electronic music).
 */

const BASE = import.meta.env.BASE_URL + 'music/'

export const MUSIC_LIBRARY = [
  { id: 'f-5',  name: 'Beautiful, You Are',    file: 'Beautiful, You Are (Instrumental).mp4' },
  { id: 'f-6',  name: 'Easy To Love',          file: 'Easy To Love (Instrumental).mp4' },
  { id: 'f-7',  name: 'Good Intentions',       file: 'Good Intentions.mp4' },
  { id: 'f-8',  name: 'Knockout',              file: 'Knockout.mp4' },
  { id: 'f-9',  name: 'Paint Me Happy',        file: 'Paint Me Happy.mp4' },
  { id: 'f-10', name: 'Pink Confetti',         file: 'Pink Confetti (Instrumental).mp4' },
  { id: 'f-11', name: 'Take Me Home',          file: 'Take Me Home.mp4' },
  { id: 'f-1',  name: 'Check This Out',        file: 'check-this-out.mp4' },
  { id: 'f-2',  name: 'Friday The 13th',       file: 'friday-the-13th.mp4' },
  { id: 'f-3',  name: 'Happy Days',            file: 'happy-days.mp4' },
  { id: 'f-4',  name: 'I Love You More',       file: 'i-love-you-more.mp4' },
  { id: 't-1',  name: 'Upbeat Drive',          file: 'track-1.mp3' },
  { id: 't-2',  name: 'Chill Electronic',      file: 'track-2.mp3' },
  { id: 't-3',  name: 'Bright Energy',         file: 'track-3.mp3' },
  { id: 't-4',  name: 'Smooth Groove',         file: 'track-4.mp3' },
  { id: 't-5',  name: 'Positive Vibes',        file: 'track-5.mp3' },
  { id: 't-6',  name: 'Tech Flow',             file: 'track-6.mp3' },
  { id: 't-7',  name: 'Happy Motion',          file: 'track-7.mp3' },
  { id: 't-8',  name: 'Modern Beat',           file: 'track-8.mp3' },
  { id: 't-9',  name: 'Synth Wave',            file: 'track-9.mp3' },
  { id: 't-10', name: 'Digital Sunrise',       file: 'track-10.mp3' },
  { id: 't-11', name: 'Ambient Pulse',         file: 'track-11.mp3' },
  { id: 't-12', name: 'Lo-Fi Chill',           file: 'track-12.mp3' },
  { id: 't-13', name: 'Funky Rhythm',          file: 'track-13.mp3' },
  { id: 't-14', name: 'Indie Electronic',      file: 'track-14.mp3' },
  { id: 't-15', name: 'Deep Focus',            file: 'track-15.mp3' },
  { id: 't-16', name: 'Neon Nights',           file: 'track-16.mp3' },
  { id: 't-17', name: 'Retro Synth',           file: 'track-17.mp3' },
  { id: 't-18', name: 'Electric Dream',        file: 'track-18.mp3' },
  { id: 't-19', name: 'Summer Energy',         file: 'track-19.mp3' },
  { id: 't-20', name: 'Future Pop',            file: 'track-20.mp3' },
]

/**
 * Returns the local URL for a library track (instant, no network fetch).
 */
export function generateTrack(trackId) {
  const track = MUSIC_LIBRARY.find((t) => t.id === trackId)
  if (!track?.file) throw new Error(`Track "${trackId}" not found`)
  return BASE + track.file
}
