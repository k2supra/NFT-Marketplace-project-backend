/* eslint-disable no-unused-vars */
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors';

import dotenv from 'dotenv'

dotenv.config()

const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
const gmail = encodeURIComponent(process.env.MONGODB_GMAIL);
const API_URL = process.env.REACT_APP_API_URL;
const PORT = process.env.REACT_APP_PORT;
const MARKETPLACE_ID = process.env.REACT_APP_MARKETPLACE_ID;

const app = express()
app.use(cors())
app.use(express.json())
app.use('/images', express.static('public/images'))

const userSchema = new mongoose.Schema(
    {
        username: String,
        email: String,
        password: String,
        bio: { type: String, default: '' },
        balance: { type: Number, default: 999 },
        followers: [{_id: String, username: String, avatarUrl: String}],
        followings: [{_id: String, username: String, avatarUrl: String}],
        avatarUrl: {type: String, default: '/images/avatar1.png'},
        bannerUrl: {type: String, default: '/images/banner1.png'},
        stats:
        {
            volume: { type: Number, default: 0 },
            sold: { type: Number, default: 0 },
        },
        nfts:
        {
          created:{
            type:[
              {
                  title: String,
                  price: String,
                  highestBid: String,
                  imageUrl: String,
              }
            ],
            default: []
          },
          owned:{
            type:[
              {
                  title: String,
                  price: String,
                  highestBid: String,
                  imageUrl: String,
              }
            ],
            default: []
          },
          collections:{
            type:[
              {
                  title: String,
                  price: String,
                  highestBid: String,
                  imageUrl: String,
              }
            ],
            default: []
          },
        }
    }
)

const User = mongoose.model('User', userSchema)

async function fixUsers() {
    try {
        const result = await User.updateMany(
            {},
            {
              $set: {
                stats:
                {
                    volume: 0,
                    sold: 0,
                },
              },
            }
        );
        console.log("Updated users:", result.modifiedCount);
    } catch (err) {
      console.error(err);
    }
  }

mongoose.connect(`mongodb+srv://${gmail}:${password}@testcluster.8jrno.mongodb.net/NFTApp?retryWrites=true&w=majority&appName=TestCluster`)
.then(() => {console.log('\x1b[32m%s\x1b[0m', "\n\n\nMongoDB connected\n\n\n"); /* fixUsers(); */})
.catch(err => console.error('\x1b[31m%s\x1b[0m', '\n\n\n❌ MongoDB connection error:', err, '\n\n\n'))

app.post('/register', async (req, res) =>
{
    try
    {
        const {username, email, password} = req.body;
        const existing = await User.findOne({email})
        if (existing) {
            return res.status(400).json({error: 'User already exists'})
        }

        const user = new User({username, email, password})
        await user.save()
        res.json(user)
    }
    catch(err)
    {
        res.status(500).json({error: err.message})
    }
})

app.post("/login", async (req, res) => {
    const { email, password } = req.body
    const user = await User.findOne({ email, password })
    if (!user) return res.status(401).json({ error: "Invalid credentials" })
    res.json(user)
})

app.get('/artist-page/:id', async (req, res)=>
{
    try {
        const user = await User.findById(req.params.id).select('-password');
        if(!user) return res.status(404).json({error: 'User not found'});
        res.json(user);
    } catch (err) {
        res.status(500).json({error: err.message})
    }
})

app.post('/artist-page/:id/nfts', async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
      if (!user) return res.status(404).json({ error: 'User not found' })
  
      const { title, price, highestBid, imageUrl } = req.body
      const newNFT = { title, price, highestBid, imageUrl }
  
      user.nfts.created.push(newNFT)
      await user.save()
  
      res.json(newNFT)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
})

app.post('/artist-page/:id/update', async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password')
      if (!user) return res.status(404).json({ error: 'User not found' })
  
      const { username, bio, avatarUrl, bannerUrl } = req.body
      const updatedUser = { username, bio, avatarUrl, bannerUrl }

      user.username = username;
      user.bio = bio;
      user.avatarUrl = avatarUrl;
      user.bannerUrl = bannerUrl;

      await user.save()
  
      res.json(updatedUser)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
})

app.post('/artist-page/:id/followedBy/:id2', async (req, res) => {
    try {
        const userToFollow = await User.findById(req.params.id)   // на кого підписуються
        if (!userToFollow) return res.status(404).json({ error: 'User not found' })
    
        const followerUser = await User.findById(req.params.id2) // хто підписується
        if (!followerUser) return res.status(404).json({ error: 'User not found' })
    
        if (userToFollow.followers.some(f => f._id.toString() === followerUser._id.toString())) {
          return res.status(400).json({ error: 'Already following' })
        }
    
        userToFollow.followers.push({
          _id: followerUser._id,
          username: followerUser.username,
          avatarUrl: followerUser.avatarUrl,
        })
    
        followerUser.followings.push({
          _id: userToFollow._id,
          username: userToFollow.username,
          avatarUrl: userToFollow.avatarUrl,
        })
    
        await userToFollow.save()
        await followerUser.save()
    
        res.json({ message: 'Followed successfully' })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
})

app.post('/artist-page/:id/unfollow/:id2', async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.id)
    const followerUser = await User.findById(req.params.id2)

    if (!userToUnfollow || !followerUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    userToUnfollow.followers = userToUnfollow.followers.filter(
      f => f._id.toString() !== followerUser._id.toString()
    )

    followerUser.followings = followerUser.followings.filter(
      f => f._id.toString() !== userToUnfollow._id.toString()
    )

    await userToUnfollow.save()
    await followerUser.save()

    res.json({ message: 'Unfollowed successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/find-user-by-id/:id', async (req, res)=>
{
    try {
        const user = await User.findById(req.params.id).select('username _id avatarUrl');
        if(!user) return res.status(404).json({error: 'User not found'});
        res.json(user);
    } catch (err) {
        res.status(500).json({error: err.message})
    }
})
app.get('/fetch-balance/:id', async (req, res)=>
{
    try {
        const user = await User.findById(req.params.id).select('balance');
        if(!user) return res.status(404).json({error: 'User not found'});
        res.json(user);
    } catch (err) {
        res.status(500).json({error: err.message})
    }
})
app.get('/fetch-marketplace-for-sale', async (req, res)=>
{
    try {
        const user = await User.findById(MARKETPLACE_ID).select('nfts.created avatarUrl username');
        if(!user) return res.status(404).json({error: 'User not found'});
        res.json(user);
    } catch (err) {
        res.status(500).json({error: err.message})
    }
})
app.post('/buy/:selledId/:buyerId/:nftId', async (req, res)=>
{
    try {
      const seller = await User.findById(req.params.selledId).select('balance nfts stats');
      const buyer = await User.findById(req.params.buyerId).select('balance nfts');

      const boughtNft = seller.nfts.created.find(nft=>nft._id.toString()===req.params.nftId);
      if (!boughtNft) return res.status(404).json({error: 'NFT not found'});

      seller.nfts.created = seller.nfts.created.filter(nft=>nft._id.toString()!==req.params.nftId);
      buyer.nfts.owned.push(boughtNft);

      seller.balance += +boughtNft.price;
      buyer.balance -= +boughtNft.price;

      seller.stats.volume += +boughtNft.price;
      seller.stats.sold += 1;

      await seller.save();
      await buyer.save();
      res.json({message: 'Purchase successful', nft: boughtNft});
    } catch (err) {
        res.status(500).json({error: err.message})
    }
})

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on ${API_URL}:${PORT}`))