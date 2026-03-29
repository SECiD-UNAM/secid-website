/**
 * SECiD Events Data
 * Central data source for all SECiD events.
 * Add new events here to have them automatically appear on events.html and journal-club.html.
 *
 * Event object fields:
 *   date      {string} ISO date string "YYYY-MM-DD"
 *   title     {string} Event title / paper name
 *   type      {string} Event type: "journal-club" | "hackathon" | "workshop" | ...
 *   presenter {string} Name of the presenter (optional)
 *   link      {string} URL for more details (optional)
 *   time      {string} Human-readable time string e.g. "6:00 PM" (optional)
 *   location  {string} Location or meeting link (optional)
 */
var SECID_EVENTS = [
  {
    date: '2026-03-18',
    title: 'NLP Foundations',
    type: 'journal-club',
    presenter: 'Fernando Avitua',
    time: '6:00 PM',
    link: 'journal-club.html'
  },
  {
    date: '2026-04-08',
    title: 'Attention Is All You Need',
    type: 'journal-club',
    presenter: 'Fernando Avitua',
    time: '6:00 PM',
    link: 'journal-club.html'
  },
  {
    date: '2026-05-06',
    title: 'BERT',
    type: 'journal-club',
    presenter: 'Artemio Padilla',
    time: '6:00 PM',
    link: 'journal-club.html'
  },
  {
    date: '2026-06-10',
    title: 'GPTs',
    type: 'journal-club',
    presenter: 'Alejandro Ramirez Bondi',
    time: '6:00 PM',
    link: 'journal-club.html'
  },
  {
    date: '2026-08-12',
    title: 'LLaMA',
    type: 'journal-club',
    presenter: 'Eduardo Gardu\u00f1o',
    time: '6:00 PM',
    link: 'journal-club.html'
  },
  {
    date: '2026-09-09',
    title: 'DeepSeek',
    type: 'journal-club',
    presenter: 'Iv\u00e1n Bar\u00f3n',
    time: '6:00 PM',
    link: 'journal-club.html'
  }
];
