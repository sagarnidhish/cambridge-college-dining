import type { WordPressPage, WordPressPost } from "../../src/sources/wordpress";

export const ST_EDMUNDS_CATERING_FIXTURE: WordPressPage = {
  id: 501,
  modified: "2026-08-10T09:00:00",
  link: "https://www.st-edmunds.cam.ac.uk/student-life/catering",
  title: { rendered: "Catering" },
  content: {
    protected: false,
    rendered: `
      <p><a href="https://www.st-edmunds.cam.ac.uk/category/catering/">Catering news</a></p>
      <table>
        <tbody>
          <tr><th>Service</th><th>Days</th><th>Time</th></tr>
          <tr><td>Breakfast</td><td>Wednesdays Only</td><td>08:00 - 09:30</td></tr>
          <tr><td>Lunch</td><td>Monday to Friday and Sunday</td><td>12:30 - 13:30</td></tr>
          <tr><td>Brunch</td><td>Only on Sat</td><td>11:00 - 12:30</td></tr>
          <tr><td>Dinner</td><td>Mon-Fri</td><td>18:30 - 19:45</td></tr>
        </tbody>
      </table>
    `
  }
};

export const ST_EDMUNDS_POST_FIXTURES: WordPressPost[] = [
  {
    id: 498,
    date: "2026-08-03T08:00:00",
    modified: "2026-08-03T08:00:00",
    link: "https://www.st-edmunds.cam.ac.uk/week-commencing-3-august-2026/",
    title: { rendered: "Week Commencing 3 August 2026" },
    content: {
      protected: false,
      rendered: `
        <p>Week Commencing 3 August 2026</p>
        <p><a href="https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/week-2-lunch.pdf">Week 2 Lunch</a></p>
        <p><a href="https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/week-2-dinner.pdf">Week 2 Dinner</a></p>
      `
    }
  },
  {
    id: 499,
    date: "2026-08-10T08:00:00",
    modified: "2026-08-10T08:00:00",
    link: "https://www.st-edmunds.cam.ac.uk/week-commencing-10-august-2026/",
    title: { rendered: "Week Commencing 10 August 2026" },
    content: {
      protected: false,
      rendered: `
        <p>Week Commencing 10 August 2026</p>
        <p>13/08 Dinner Service: 18:00 - 18:45</p>
        <p>Please book a table with the Catering team.</p>
        <p><a href="https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/week-3-lunch.pdf">Week 3 Lunch Menu</a></p>
        <p><a href="https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/week-3-dinner.pdf">Week 3 Dinner Menu</a></p>
      `
    }
  }
];

export const ST_EDMUNDS_LIVE_CATERING_FIXTURE: WordPressPage = {
  ...ST_EDMUNDS_CATERING_FIXTURE,
  content: {
    protected: false,
    rendered: `
      <table>
        <tbody>
          <tr><th>Service</th><th>Days</th><th>Time</th></tr>
          <tr><td>Breakfast</td><td>Wednesdays Only</td><td>8:00am – 9:30 am</td></tr>
          <tr><td>Lunch</td><td>Monday to Friday and Sunday</td><td>12:30pm – 1:30pm</td></tr>
          <tr><td>Brunch</td><td>Only on Sat</td><td>11:00am – 12:30pm</td></tr>
          <tr><td>Dinner</td><td>Mon-Fri</td><td>6:30pm – 7:45 pm</td></tr>
        </tbody>
      </table>
    `
  }
};

export const ST_EDMUNDS_LIVE_POST_FIXTURE: WordPressPost = {
  id: 513,
  date: "2026-08-10T10:57:07",
  modified: "2026-08-10T10:57:07",
  link: "https://www.st-edmunds.cam.ac.uk/weekly-menus-10-august/",
  title: { rendered: "" },
  content: {
    protected: false,
    rendered: `
      <p>Weekly Menus – Week Commencing 10th August</p>
      <p>13/08 Dinner Service: 6:00pm – 6:45pm</p>
      <p><a href="https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/live-week-lunch.pdf">Lunch menu</a></p>
      <p><a href="https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/live-week-dinner.pdf">Dinner menu</a></p>
    `
  }
};
