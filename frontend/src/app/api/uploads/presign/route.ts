// // It will:
// // verify the user is logged in and is a dressmaker
// // accept fileName and contentType
// // create a unique object key like portfolio/{dressmakerId}/{uuid}-{fileName}
// // return { uploadUrl, publicUrl }

// create a dashboard page 
// Client-side: upload flow (dashboard)
// On the dashboard page:
// user selects images
// for each image:
// call /api/uploads/presign to get an uploadUrl
// PUT the file to uploadUrl
// store the publicUrl in your component state
// when user clicks “Save portfolio item”:
// send title, tags, attireType, imageUrls[] to your “create portfolio item” API route

// Part 3 — Prisma models you’ll use for portfolio (simple version)
// You already have:
// DressmakerProfile
// PortfolioItem { imageUrls String[] }
// That’s enough to ship Step 3.
// Later, you can switch to a FileAsset table