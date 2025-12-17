📚 Library Backend API

🔗 Live API Server: https://library-server-tawny.vercel.app/
🔗 Live Link Clint: https://library-z3321.netlify.app/

📦 GitHub Repository Server: https://github.com/ziam8415/Book_library_server

📦 GitHub Repository Clint: https://github.com/ziam8415/Library

This is the backend server for the Library / BookCourier web application. It provides RESTful APIs for managing books, users, orders, wishlists, and reviews. The backend is built with scalability, security, and performance in mind.

✨ Features
🔐 Authentication & Users

User creation & update

Google-authenticated user support

Secure user data handling

📖 Books Management

Add new books

Get all books

Get latest books

Get single book by ID

Category-based filtering

🛒 Orders

Place book orders

Track order status

Store customer & seller information

Timestamped orders

❤️ Wishlist

Add books to wishlist

Prevent duplicate wishlist entries

Fetch wishlist by user email

⭐ Reviews

Add reviews for ordered books

Fetch reviews by book ID

Rating & comment support

Average rating calculation (handled in frontend)

🛠 Tech Stack

Node.js

Express.js

MongoDB

MongoDB Atlas

CORS

dotenv

Vercel (Deployment)

📂 Project Structure
Book_library_server/
├── routes/
│ ├── books.js
│ ├── orders.js
│ ├── users.js
│ ├── wishlist.js
│ └── reviews.js
├── controllers/
├── models/
├── middleware/
├── index.js
└── package.json

🌐 API Endpoints (Sample)
📖 Books
Method Endpoint Description
GET /books Get all books
GET /books/latest Get latest books
GET /books/:id Get single book
❤️ Wishlist
Method Endpoint
POST /wishlist
GET /wishlist/user/:email
🛒 Orders
Method Endpoint
POST /orders
GET /orders
⭐ Reviews
Method Endpoint
POST /reviews
GET /reviews/book/:id
🚀 Getting Started (Local Setup)
1️⃣ Clone the Repository
git clone https://github.com/ziam8415/Book_library_server.git
cd Book_library_server

2️⃣ Install Dependencies
npm install

3️⃣ Environment Variables

Create a .env file in the root directory:

PORT=5000
MONGODB_URI=your_mongodb_connection_string

4️⃣ Run the Server
npm run start

or (for development)

npm run dev

📦 Deployment

Hosting: Vercel

Database: MongoDB Atlas

Environment Variables: Managed via Vercel dashboard

🔒 Security Notes

Sensitive credentials stored in .env

MongoDB Atlas IP whitelist enabled

CORS properly configured

📌 Future Enhancements

JWT-based route protection

Role-based access (Admin/User)

Payment integration (Stripe)

Pagination & search

Order status updates

👨‍💻 Author

Ziam
Backend & Frontend Developer
Focused on building scalable, real-world web applications.
