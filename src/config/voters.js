/**
 * src/config/voters.js
 *
 * Authorized voter email addresses for the Abhivriddhi event.
 *
 * HOW TO ADD YOUR EMAILS:
 * Replace the placeholder entries below with your ~50 authorized emails.
 * All comparisons are case-insensitive (emails are normalized to lowercase).
 *
 * After editing, run `npm run build` and redeploy to Vercel.
 */

const AUTHORIZED_VOTERS = [
  'shreyash.padir23@vit.edu',
  'shiv.wagh24@vit.edu',
  'vedanti.raut24@vit.edu',
  'parth.sardeshmukh24@vit.edu',
  'rohit.ghode24@vit.edu',
  'shravani.gaikwad25@vit.edu',
  'omkar.sonawane24@vit.edu',
  'samarth.dhagate24@vit.edu',
  'aarya.jadhav241@vit.edu',
  'vedant.patil24@vit.edu',
  'aniket.khadake24@vit.edu',
  'poorva.sonawane24@vit.edu',
  'omsai.rathod24@vit.edu',
  'adinath.dound24@vit.edu',
  'sejal.1252070056@vit.edu',
  'samyak.shende24@vit.edu',
  'ved.madurwar24@vit.edu',
  'anway.shimpne25@vit.edu',
  'divya.1251130116@vit.edu',
  'shruti.dhage24@vit.edu',
  'bhoomi.1251070313@vit.edu',
  'laksh.1251030229@vit.edu',
  'niyal.1251071061@vit.edu',
  'sohanlal.1251030240@vit.edu',
  'adwait.1251010764@vit.edu',
  'srushti.1251100067@vit.edu',
  'osiya.1251090370@vit.edu',
  'poorva.12620632@vit.edu',
  'sarthak.1251140017@vit.edu',
  'sonali.1252070051@vit.edu',
  'shivani.1251040014@vit.edu',
  'pranil.1251130393@vit.edu',
  'utkarsha.1251090089@vit.edu',
  'shubham.1251010382@vit.edu',
  'yashraj.hande25@vit.edu',
  'samiksha.1252070059@vit.edu',
  'rugved.1251100141@vit.edu',
  'swarali.patil25@vit.edu',
  'tushar.1251010597@vit.edu',
  'soham.1251030216@vit.edu',
  'bhagwan.1251150437@vit.edu',
  'krishna.1251070790@vit.edu',
  'shreya.sanap24@vit.edu',
  'aishwarya.1251040042@vit.edu',
  'piyush.1251140071@vit.edu',
  'radhika.1252130004@vit.edu',
  'srushti.padekar25@vit.edu',
  'aadi.1251070312@vit.edu',
  'unnati.1251010735@vit.edu',
  'shrawani.1251130488@vit.edu',
  'ashwin.1251130385@vit.edu',
  'arnav.1251130495@vit.edu',
  'yash.bhagyawant24@vit.edu',
  'advait.1251080222@vit.edu',
  'omkar.1251010704@vit.edu',
  'abhishek.1251130044@vit.edu',
];

/** Normalized set for O(1) lookup */
export const VOTER_SET = new Set(AUTHORIZED_VOTERS.map(e => e.trim().toLowerCase()));

/** Returns true if the given email is an authorized voter */
export function isAuthorizedVoter(email) {
  return VOTER_SET.has(String(email || '').trim().toLowerCase());
}
