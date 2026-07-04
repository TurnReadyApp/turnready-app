import React, { useState, useEffect, useRef } from "react";
import { supabase, signIn, signUp, signOut, getCurrentUser, updateUserProfile, getTeamCleaners, getProperties, getPropertyFull, createProperty, updateProperty, deleteProperty, getJobs, createJob, updateJob, getMessages, sendMessage, subscribeToMessages, getNotifications, createNotification, subscribeToNotifications, uploadVideoToStorage, uploadImageToStorage, isStorageUrl } from "./lib/supabase.js";





// ─── ERROR BOUNDARY ──────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("TurnReady crash:", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight:"100vh",background:"#0D0D0D",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:24}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:22,fontWeight:900,letterSpacing:1}}>
            <span style={{color:"#FFF"}}>TURN</span><span style={{color:"#CC0000"}}>READY</span>
          </div>
          <div style={{color:"#EF4444",fontSize:14,fontWeight:700}}>Something went wrong</div>
          <div style={{background:"#1A1A1A",border:"1px solid #333",borderRadius:10,padding:16,maxWidth:360,width:"100%"}}>
            <div style={{color:"#EF4444",fontSize:12,fontFamily:"monospace",wordBreak:"break-all",marginBottom:8}}>
              {this.state.error&&this.state.error.toString()}
            </div>
            {this.state.errorInfo&&(
              <div style={{color:"#666",fontSize:10,fontFamily:"monospace",whiteSpace:"pre-wrap",maxHeight:200,overflow:"auto"}}>
                {this.state.errorInfo.componentStack}
              </div>
            )}
          </div>
          <button onClick={()=>window.location.reload()}
            style={{background:"#CC0000",border:"none",borderRadius:8,color:"#FFF",fontSize:13,fontWeight:700,padding:"10px 24px",cursor:"pointer"}}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}


// ─── IMAGE COMPRESSION HELPER ─────────────────────────────────────────────────
function compressImage(dataUrl, maxWidth, maxHeight, quality, callback) {
  var img = new window.Image();
  img.onload = function() {
    var canvas = document.createElement('canvas');
    var w = img.width, h = img.height;
    if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
    if (h > maxHeight) { w = Math.round(w * maxHeight / h); h = maxHeight; }
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', quality || 0.7));
  };
  img.src = dataUrl;
}

// ─── BRAND COLORS ────────────────────────────────────────────────────────────
const DARK_THEME = {
  bg:"#0D0D0D",surface:"#141414",card:"#1A1A1A",border:"#2A2A2A",
  red:"#CC0000",redBright:"#FF1111",redDim:"#990000",
  redGlow:"rgba(204,0,0,0.15)",redGlow2:"rgba(204,0,0,0.08)",
  white:"#FFFFFF",offWhite:"#E8E8E8",muted:"#888888",mutedLight:"#AAAAAA",
  success:"#22C55E",warn:"#F59E0B",danger:"#EF4444",
};
const LIGHT_THEME = {
  bg:"#F0F0F0",surface:"#FAFAFA",card:"#FFFFFF",border:"#DDDDDD",
  red:"#CC0000",redBright:"#DD0000",redDim:"#AA0000",
  redGlow:"rgba(204,0,0,0.08)",redGlow2:"rgba(204,0,0,0.04)",
  white:"#FFFFFF",offWhite:"#222222",muted:"#666666",mutedLight:"#888888",
  success:"#16A34A",warn:"#D97706",danger:"#DC2626",
};
var C = DARK_THEME;

const F = {
  display: "'Bebas Neue', sans-serif",
  body: "'Inter', sans-serif",
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const INIT_PROPS = [
  {
    id:"p1", name:"Oceanview Villa", address:"42 Shoreline Blvd, Malibu, CA 90265",
    type:"Airbnb", pay:185, bedrooms:4, bathrooms:3,
    photo:"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80",
    description:"Luxury beachfront property. Guests check out at 11am, next check-in 4pm.",
    assignedTo:"c1", scheduledDate:"2026-06-06", scheduledTime:"10:00", status:"available",
    notes:"",
    schedule:[{id:"slot1",cleanerId:"c1",date:"2026-06-15",time:"11:00",status:"pending_acceptance",assignedAt:"2026-06-19T10:00:00.000Z",uploads:[]}],
    inventory:[
        {id:"i1",item:"Toilet Paper",required:8,inStock:1,cleanerStatus:"low"},
        {id:"i2",item:"Paper Towels",required:4,inStock:4},
        {id:"i3",item:"Body Wash",required:4,inStock:0,cleanerStatus:"low"},
        {id:"i4",item:"Shampoo",required:4,inStock:4},
        {id:"i5",item:"Conditioner",required:4,inStock:4},
        {id:"i6",item:"Hand Soap",required:3,inStock:3},
        {id:"i7",item:"Dish Soap",required:2,inStock:2},
        {id:"i8",item:"Dishwasher Pods",required:10,inStock:10},
        {id:"i9",item:"Kitchen Trash Bags",required:6,inStock:6},
        {id:"i10",item:"Bathroom Trash Bags",required:6,inStock:6},
        {id:"i11",item:"Coffee",required:2,inStock:2},
        {id:"i12",item:"Creamer",required:2,inStock:2},
        {id:"i13",item:"Sugar",required:1,inStock:1},
        {id:"i14",item:"Water",required:12,inStock:12},
        {id:"i15",item:"Laundry Soap",required:1,inStock:1},
        {id:"i16",item:"Bleach",required:1,inStock:1},
      ],
    tasks:[
      {id:"t1",section:"Arrival",label:"Turn on lights, fans, and all TVs — note what's not working",done:false},
      {id:"t2",section:"Arrival",label:"Walk the entire property once before touching anything",done:false},
      {id:"t3",section:"Arrival",label:"Check high-risk areas: kitchen, bathrooms, beds, patio",done:false},
      {id:"t4",section:"Arrival",label:"Look for hair buildup, stains, odors, broken items, or signs of a party",done:false},
      {id:"t5",section:"Arrival",label:"Photo/video any damage or heavy mess — notify Harvey if significant",done:false},
      {id:"t6",section:"Living & Dining",label:"Vacuum sofa, chairs, and under all furniture — check edges and corners",done:false},
      {id:"t7",section:"Living & Dining",label:"Fluff and align all cushions and throw pillows per staging guide",done:false},
      {id:"t8",section:"Living & Dining",label:"Wipe coffee table, side tables, and TV stand",done:false},
      {id:"t9",section:"Living & Dining",label:"Clean TV screen streak-free — wipe remotes and place neatly",done:false},
      {id:"t10",section:"Living & Dining",label:"Dust all eye-level surfaces: shelves, décor, blinds, windowsills",done:false},
      {id:"t11",section:"Living & Dining",label:"Wipe dining table (top, edges, legs) and align chairs evenly",done:false},
      {id:"t12",section:"Living & Dining",label:"Sanitize light switches and door handles",done:false},
      {id:"t13",section:"Living & Dining",label:"Mop hard floors — check corners and baseboards",done:false},
      {id:"t14",section:"Living & Dining",label:"FINAL CHECK: Furniture matches staging photos?",done:false},
      {id:"t15",section:"Kitchen",label:"Wipe countertops and backsplash spotless — no grease, crumbs, or streaks",done:false},
      {id:"t16",section:"Kitchen",label:"Clean sink, faucet, and handles — no odors or water spots",done:false},
      {id:"t17",section:"Kitchen",label:"Empty fridge of all guest food — wipe shelves, no spills or odors",done:false},
      {id:"t18",section:"Kitchen",label:"Clean microwave inside and out — no splatter",done:false},
      {id:"t19",section:"Kitchen",label:"Degrease stovetop and burner area — wipe control knobs",done:false},
      {id:"t20",section:"Kitchen",label:"Empty dishwasher — check filter, wipe door inside and out",done:false},
      {id:"t21",section:"Kitchen",label:"Wipe cabinet fronts — open all cabinets and drawers, check for crumbs",done:false},
      {id:"t22",section:"Kitchen",label:"Clean coffee maker, empty toaster, wipe all small appliances",done:false},
      {id:"t23",section:"Kitchen",label:"Remove trash, reline bin, sweep and mop floors including corners",done:false},
      {id:"t24",section:"Kitchen",label:"FINAL CHECK: Would you confidently cook and eat here right now?",done:false},
      {id:"t25",section:"Bathrooms",label:"Clean mirror streak-free — no water marks or fingerprints",done:false},
      {id:"t26",section:"Bathrooms",label:"Scrub sink basin spotless — polish faucet and handles",done:false},
      {id:"t27",section:"Bathrooms",label:"Scrub toilet fully: inside bowl, seat top and bottom, hinges, and base",done:false},
      {id:"t28",section:"Bathrooms",label:"Scrub shower walls and tub — no soap scum, hair in drain, or mildew",done:false},
      {id:"t29",section:"Bathrooms",label:"Check drawers and under-sink — wipe out hair, dust, or residue",done:false},
      {id:"t30",section:"Bathrooms",label:"Restock amenities: soap, shampoo, conditioner, TP folded to a point",done:false},
      {id:"t31",section:"Bathrooms",label:"Stage hand towels: clean, folded evenly, and centered",done:false},
      {id:"t32",section:"Bathrooms",label:"Sanitize light switches, door handles — wipe wall marks",done:false},
      {id:"t33",section:"Bathrooms",label:"Vacuum and mop floors — check corners and edges for hair",done:false},
      {id:"t34",section:"Bathrooms",label:"FINAL CHECK: Would you confidently shower and leave your items here?",done:false},
      {id:"t35",section:"Bedrooms",label:"Strip all beds — bag all used linens separately",done:false},
      {id:"t36",section:"Bedrooms",label:"Remake beds: sheets tight and wrinkle-free, pillows fluffed and squared",done:false},
      {id:"t37",section:"Bedrooms",label:"Check mattress fully covered — no hair on bedding or headboard",done:false},
      {id:"t38",section:"Bedrooms",label:"Dust all surfaces: headboard, nightstands, dressers, lamps, mirrors",done:false},
      {id:"t39",section:"Bedrooms",label:"Open all drawers and closets — check for guest items or debris",done:false},
      {id:"t40",section:"Bedrooms",label:"Sanitize light switches — wipe any wall marks",done:false},
      {id:"t41",section:"Bedrooms",label:"Vacuum floors thoroughly — including under-bed area and closet floor",done:false},
      {id:"t42",section:"Bedrooms",label:"Dust windowsills, blinds, and straighten curtains",done:false},
      {id:"t43",section:"Bedrooms",label:"FINAL CHECK: Would you sleep here tonight?",done:false},
      {id:"t44",section:"Patio & Outdoor",label:"Remove all trash, food residue, cups, or debris",done:false},
      {id:"t45",section:"Patio & Outdoor",label:"Sweep all walking areas — check for safety hazards",done:false},
      {id:"t46",section:"Patio & Outdoor",label:"Wipe furniture: tables, chairs, armrests, cushions",done:false},
      {id:"t47",section:"Patio & Outdoor",label:"Clean and cover grill — check propane is off",done:false},
      {id:"t48",section:"Patio & Outdoor",label:"Arrange furniture neatly per staging guide",done:false},
      {id:"t49",section:"Patio & Outdoor",label:"FINAL CHECK: Would guests feel comfortable relaxing here immediately?",done:false},
      {id:"t50",section:"Departure",label:"Full walkthrough completed as a guest",done:false},
      {id:"t51",section:"Departure",label:"All room standards passed: Kitchen, Bath, Bedrooms, Living Areas",done:false},
      {id:"t52",section:"Departure",label:"No missed hair, crumbs, odors, or staging issues",done:false},
      {id:"t53",section:"Departure",label:"All linens clean, folded, and stored properly",done:false},
      {id:"t54",section:"Departure",label:"Dishwasher empty",done:false},
      {id:"t55",section:"Departure",label:"Washer door cracked open",done:false},
      {id:"t56",section:"Departure",label:"Dryer lint trap cleaned",done:false},
      {id:"t57",section:"Departure",label:"Trash removed to exterior bins",done:false},
      {id:"t58",section:"Departure",label:"Thermostat set to host standard (Heat/AC: 73°)",done:false},
      {id:"t59",section:"Departure",label:"Ceiling fans set to low",done:false},
      {id:"t60",section:"Departure",label:"Overhead lights off",done:false},
      {id:"t61",section:"Departure",label:"Porch / exterior lights on",done:false},
      {id:"t62",section:"Departure",label:"Supply closets locked",done:false},
      {id:"t63",section:"Departure",label:"All exterior doors and windows locked",done:false},
      {id:"t64",section:"Departure",label:"Keys returned to proper location",done:false},
      {id:"t65",section:"Departure",label:"✅ I approve this unit for immediate guest check-in",done:false},
    ],
    rooms:[
      {id:"r1",name:"Living Room",icon:"🛋️",guide:"Fluff all pillows symmetrically. Center throw blanket on left armrest. Remotes in tray on coffee table. Open blinds 45°. Turn on ambient lamp.",clip:"Wide angle — staged sofa, clean coffee table, open blinds, lamp on.",refPhotos:["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80"],refVideo:null,video:null},
      {id:"r2",name:"Master Bedroom",icon:"🛏️",guide:"Hospital corners on all sheets. Decorative pillows: 2 large, 2 standard, 1 accent. Fold towel art on bed. Welcome card on nightstand.",clip:"Pan from door — made bed, staged nightstands, natural light.",refPhotos:["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80"],refVideo:null,video:null},
      {id:"r3",name:"Kitchen",icon:"🍳",guide:"All dishes put away. Counter completely clear except fruit bowl (centered). Wipe backsplash. Align chairs evenly at island.",clip:"Clean counters, aligned seating, spotless appliances.",refPhotos:["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80"],refVideo:null,video:null},
      {id:"r4",name:"Bathrooms",icon:"🚿",guide:"Towels folded in thirds, hanging evenly. TP folded to a point. Toiletries in basket. Mirror streak-free. Trash liner replaced.",clip:"Staged towels, clean sink, folded TP point, spotless mirror.",refPhotos:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"],refVideo:null,video:null},
      {id:"r5",name:"Outdoor/Patio",icon:"🌿",guide:"Wipe patio furniture. Straighten chairs around table. Sweep deck. Check for guest items. Ensure lights off.",clip:"Swept patio, aligned furniture, cleared surfaces.",refPhotos:["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80"],refVideo:null,video:null},
    ],
  },
  {
    id:"p2", name:"Downtown Loft", address:"820 5th Ave, New York, NY 10001",
    type:"Rental", pay:120, bedrooms:2, bathrooms:1,
    photo:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
    description:"Modern loft in midtown. Minimalist — keep surfaces completely clear.",
    assignedTo:"c1", scheduledDate:"2026-06-07", scheduledTime:"09:00", status:"available",
    schedule:[{id:"slot2",cleanerId:"c1",date:"2026-06-07",time:"09:00",status:"pending_acceptance",assignedAt:"2026-06-19T06:00:00.000Z",uploads:[]}],
    notes:"Key is under the mat. Contact building super if elevator is down.",
    inventory:[
        {id:"i1",item:"Toilet Paper",required:8,inStock:8},
        {id:"i2",item:"Paper Towels",required:4,inStock:4},
        {id:"i3",item:"Body Wash",required:4,inStock:4},
        {id:"i4",item:"Shampoo",required:4,inStock:4},
        {id:"i5",item:"Conditioner",required:4,inStock:4},
        {id:"i6",item:"Hand Soap",required:3,inStock:3},
        {id:"i7",item:"Dish Soap",required:2,inStock:2},
        {id:"i8",item:"Dishwasher Pods",required:10,inStock:10},
        {id:"i9",item:"Kitchen Trash Bags",required:6,inStock:6},
        {id:"i10",item:"Bathroom Trash Bags",required:6,inStock:6},
        {id:"i11",item:"Coffee",required:2,inStock:2},
        {id:"i12",item:"Creamer",required:2,inStock:2},
        {id:"i13",item:"Sugar",required:1,inStock:1},
        {id:"i14",item:"Water",required:12,inStock:12},
        {id:"i15",item:"Laundry Soap",required:1,inStock:1},
        {id:"i16",item:"Bleach",required:1,inStock:1},
      ],
    tasks:[
      {id:"t1",section:"Arrival",label:"Turn on lights, fans, and all TVs — note what's not working",done:false},
      {id:"t2",section:"Arrival",label:"Walk the entire property once before touching anything",done:false},
      {id:"t3",section:"Arrival",label:"Check high-risk areas: kitchen, bathrooms, beds, patio",done:false},
      {id:"t4",section:"Arrival",label:"Look for hair buildup, stains, odors, broken items, or signs of a party",done:false},
      {id:"t5",section:"Arrival",label:"Photo/video any damage or heavy mess — notify Harvey if significant",done:false},
      {id:"t6",section:"Living & Dining",label:"Vacuum sofa, chairs, and under all furniture — check edges and corners",done:false},
      {id:"t7",section:"Living & Dining",label:"Fluff and align all cushions and throw pillows per staging guide",done:false},
      {id:"t8",section:"Living & Dining",label:"Wipe coffee table, side tables, and TV stand",done:false},
      {id:"t9",section:"Living & Dining",label:"Clean TV screen streak-free — wipe remotes and place neatly",done:false},
      {id:"t10",section:"Living & Dining",label:"Dust all eye-level surfaces: shelves, décor, blinds, windowsills",done:false},
      {id:"t11",section:"Living & Dining",label:"Wipe dining table (top, edges, legs) and align chairs evenly",done:false},
      {id:"t12",section:"Living & Dining",label:"Sanitize light switches and door handles",done:false},
      {id:"t13",section:"Living & Dining",label:"Mop hard floors — check corners and baseboards",done:false},
      {id:"t14",section:"Living & Dining",label:"FINAL CHECK: Furniture matches staging photos?",done:false},
      {id:"t15",section:"Kitchen",label:"Wipe countertops and backsplash spotless — no grease, crumbs, or streaks",done:false},
      {id:"t16",section:"Kitchen",label:"Clean sink, faucet, and handles — no odors or water spots",done:false},
      {id:"t17",section:"Kitchen",label:"Empty fridge of all guest food — wipe shelves, no spills or odors",done:false},
      {id:"t18",section:"Kitchen",label:"Clean microwave inside and out — no splatter",done:false},
      {id:"t19",section:"Kitchen",label:"Degrease stovetop and burner area — wipe control knobs",done:false},
      {id:"t20",section:"Kitchen",label:"Empty dishwasher — check filter, wipe door inside and out",done:false},
      {id:"t21",section:"Kitchen",label:"Wipe cabinet fronts — open all cabinets and drawers, check for crumbs",done:false},
      {id:"t22",section:"Kitchen",label:"Clean coffee maker, empty toaster, wipe all small appliances",done:false},
      {id:"t23",section:"Kitchen",label:"Remove trash, reline bin, sweep and mop floors including corners",done:false},
      {id:"t24",section:"Kitchen",label:"FINAL CHECK: Would you confidently cook and eat here right now?",done:false},
      {id:"t25",section:"Bathrooms",label:"Clean mirror streak-free — no water marks or fingerprints",done:false},
      {id:"t26",section:"Bathrooms",label:"Scrub sink basin spotless — polish faucet and handles",done:false},
      {id:"t27",section:"Bathrooms",label:"Scrub toilet fully: inside bowl, seat top and bottom, hinges, and base",done:false},
      {id:"t28",section:"Bathrooms",label:"Scrub shower walls and tub — no soap scum, hair in drain, or mildew",done:false},
      {id:"t29",section:"Bathrooms",label:"Check drawers and under-sink — wipe out hair, dust, or residue",done:false},
      {id:"t30",section:"Bathrooms",label:"Restock amenities: soap, shampoo, conditioner, TP folded to a point",done:false},
      {id:"t31",section:"Bathrooms",label:"Stage hand towels: clean, folded evenly, and centered",done:false},
      {id:"t32",section:"Bathrooms",label:"Sanitize light switches, door handles — wipe wall marks",done:false},
      {id:"t33",section:"Bathrooms",label:"Vacuum and mop floors — check corners and edges for hair",done:false},
      {id:"t34",section:"Bathrooms",label:"FINAL CHECK: Would you confidently shower and leave your items here?",done:false},
      {id:"t35",section:"Bedrooms",label:"Strip all beds — bag all used linens separately",done:false},
      {id:"t36",section:"Bedrooms",label:"Remake beds: sheets tight and wrinkle-free, pillows fluffed and squared",done:false},
      {id:"t37",section:"Bedrooms",label:"Check mattress fully covered — no hair on bedding or headboard",done:false},
      {id:"t38",section:"Bedrooms",label:"Dust all surfaces: headboard, nightstands, dressers, lamps, mirrors",done:false},
      {id:"t39",section:"Bedrooms",label:"Open all drawers and closets — check for guest items or debris",done:false},
      {id:"t40",section:"Bedrooms",label:"Sanitize light switches — wipe any wall marks",done:false},
      {id:"t41",section:"Bedrooms",label:"Vacuum floors thoroughly — including under-bed area and closet floor",done:false},
      {id:"t42",section:"Bedrooms",label:"Dust windowsills, blinds, and straighten curtains",done:false},
      {id:"t43",section:"Bedrooms",label:"FINAL CHECK: Would you sleep here tonight?",done:false},
      {id:"t44",section:"Patio & Outdoor",label:"Remove all trash, food residue, cups, or debris",done:false},
      {id:"t45",section:"Patio & Outdoor",label:"Sweep all walking areas — check for safety hazards",done:false},
      {id:"t46",section:"Patio & Outdoor",label:"Wipe furniture: tables, chairs, armrests, cushions",done:false},
      {id:"t47",section:"Patio & Outdoor",label:"Clean and cover grill — check propane is off",done:false},
      {id:"t48",section:"Patio & Outdoor",label:"Arrange furniture neatly per staging guide",done:false},
      {id:"t49",section:"Patio & Outdoor",label:"FINAL CHECK: Would guests feel comfortable relaxing here immediately?",done:false},
      {id:"t50",section:"Departure",label:"Full walkthrough completed as a guest",done:false},
      {id:"t51",section:"Departure",label:"All room standards passed: Kitchen, Bath, Bedrooms, Living Areas",done:false},
      {id:"t52",section:"Departure",label:"No missed hair, crumbs, odors, or staging issues",done:false},
      {id:"t53",section:"Departure",label:"All linens clean, folded, and stored properly",done:false},
      {id:"t54",section:"Departure",label:"Dishwasher empty",done:false},
      {id:"t55",section:"Departure",label:"Washer door cracked open",done:false},
      {id:"t56",section:"Departure",label:"Dryer lint trap cleaned",done:false},
      {id:"t57",section:"Departure",label:"Trash removed to exterior bins",done:false},
      {id:"t58",section:"Departure",label:"Thermostat set to host standard (Heat/AC: 73°)",done:false},
      {id:"t59",section:"Departure",label:"Ceiling fans set to low",done:false},
      {id:"t60",section:"Departure",label:"Overhead lights off",done:false},
      {id:"t61",section:"Departure",label:"Porch / exterior lights on",done:false},
      {id:"t62",section:"Departure",label:"Supply closets locked",done:false},
      {id:"t63",section:"Departure",label:"All exterior doors and windows locked",done:false},
      {id:"t64",section:"Departure",label:"Keys returned to proper location",done:false},
      {id:"t65",section:"Departure",label:"✅ I approve this unit for immediate guest check-in",done:false},
    ],
    rooms:[
      {id:"r1",name:"Living Room",icon:"🛋️",guide:"Clear coffee table completely. Fold throw neatly on sofa arm. Cushions upright.",clip:"Minimal loft staging — clean lines, clear floor.",refPhotos:["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80"],refVideo:null,video:null},
      {id:"r2",name:"Bedroom",icon:"🛏️",guide:"Crisp sheets, pillows centered, blinds open halfway.",clip:"Neat bed, clear nightstand, natural light.",refPhotos:["https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&q=80"],refVideo:null,video:null},
    ],
  },
  {
    id:"p3", name:"867 Welch Street", address:"867 Welch St, Atlanta, Georgia 30310, USA",
    type:"Airbnb", pay:150, bedrooms:4, bathrooms:3,
    photo:"",
    description:"4 bed / 3 bath home with full kitchen, living room, backyard.",
    assignedTo:"c2", scheduledDate:"", scheduledTime:"", status:"available", notes:"",guestRating:null,checkIn:"16:00",checkOut:"11:00",sameDay:true,extraDetails:[],
    schedule:[{id:"slot3",cleanerId:"c2",date:"2026-06-20",time:"11:00",status:"open",assignedAt:null,uploads:[]}],
    inventory:[
        {id:"i1",item:"Toilet Paper",required:8,inStock:8},
        {id:"i2",item:"Paper Towels",required:4,inStock:4},
        {id:"i3",item:"Body Wash",required:4,inStock:4},
        {id:"i4",item:"Shampoo",required:4,inStock:4},
        {id:"i5",item:"Conditioner",required:4,inStock:4},
        {id:"i6",item:"Hand Soap",required:3,inStock:3},
        {id:"i7",item:"Dish Soap",required:2,inStock:2},
        {id:"i8",item:"Dishwasher Pods",required:10,inStock:10},
        {id:"i9",item:"Kitchen Trash Bags",required:6,inStock:6},
        {id:"i10",item:"Bathroom Trash Bags",required:6,inStock:6},
        {id:"i11",item:"Coffee",required:2,inStock:2},
        {id:"i12",item:"Creamer",required:2,inStock:2},
        {id:"i13",item:"Sugar",required:1,inStock:1},
        {id:"i14",item:"Water",required:12,inStock:12},
        {id:"i15",item:"Laundry Soap",required:1,inStock:1},
        {id:"i16",item:"Bleach",required:1,inStock:1},
      ],
    tasks:[
      {id:"t1",section:"Arrival",label:"Turn on lights, fans, and all TVs — note what's not working",done:false},
      {id:"t2",section:"Arrival",label:"Walk the entire property once before touching anything",done:false},
      {id:"t3",section:"Arrival",label:"Check high-risk areas: kitchen, bathrooms, beds, patio",done:false},
      {id:"t4",section:"Arrival",label:"Look for hair buildup, stains, odors, broken items, or signs of a party",done:false},
      {id:"t5",section:"Arrival",label:"Photo/video any damage or heavy mess — notify Harvey if significant",done:false},
      {id:"t6",section:"Living & Dining",label:"Vacuum sofa, chairs, and under all furniture — check edges and corners",done:false},
      {id:"t7",section:"Living & Dining",label:"Fluff and align all cushions and throw pillows per staging guide",done:false},
      {id:"t8",section:"Living & Dining",label:"Wipe coffee table, side tables, and TV stand",done:false},
      {id:"t9",section:"Living & Dining",label:"Clean TV screen streak-free — wipe remotes and place neatly",done:false},
      {id:"t10",section:"Living & Dining",label:"Dust all eye-level surfaces: shelves, décor, blinds, windowsills",done:false},
      {id:"t11",section:"Living & Dining",label:"Wipe dining table (top, edges, legs) and align chairs evenly",done:false},
      {id:"t12",section:"Living & Dining",label:"Sanitize light switches and door handles",done:false},
      {id:"t13",section:"Living & Dining",label:"Mop hard floors — check corners and baseboards",done:false},
      {id:"t14",section:"Living & Dining",label:"FINAL CHECK: Furniture matches staging photos?",done:false},
      {id:"t15",section:"Kitchen",label:"Wipe countertops and backsplash spotless — no grease, crumbs, or streaks",done:false},
      {id:"t16",section:"Kitchen",label:"Clean sink, faucet, and handles — no odors or water spots",done:false},
      {id:"t17",section:"Kitchen",label:"Empty fridge of all guest food — wipe shelves, no spills or odors",done:false},
      {id:"t18",section:"Kitchen",label:"Clean microwave inside and out — no splatter",done:false},
      {id:"t19",section:"Kitchen",label:"Degrease stovetop and burner area — wipe control knobs",done:false},
      {id:"t20",section:"Kitchen",label:"Empty dishwasher — check filter, wipe door inside and out",done:false},
      {id:"t21",section:"Kitchen",label:"Wipe cabinet fronts — open all cabinets and drawers, check for crumbs",done:false},
      {id:"t22",section:"Kitchen",label:"Clean coffee maker, empty toaster, wipe all small appliances",done:false},
      {id:"t23",section:"Kitchen",label:"Remove trash, reline bin, sweep and mop floors including corners",done:false},
      {id:"t24",section:"Kitchen",label:"FINAL CHECK: Would you confidently cook and eat here right now?",done:false},
      {id:"t25",section:"Bathrooms",label:"Clean mirror streak-free — no water marks or fingerprints",done:false},
      {id:"t26",section:"Bathrooms",label:"Scrub sink basin spotless — polish faucet and handles",done:false},
      {id:"t27",section:"Bathrooms",label:"Scrub toilet fully: inside bowl, seat top and bottom, hinges, and base",done:false},
      {id:"t28",section:"Bathrooms",label:"Scrub shower walls and tub — no soap scum, hair in drain, or mildew",done:false},
      {id:"t29",section:"Bathrooms",label:"Check drawers and under-sink — wipe out hair, dust, or residue",done:false},
      {id:"t30",section:"Bathrooms",label:"Restock amenities: soap, shampoo, conditioner, TP folded to a point",done:false},
      {id:"t31",section:"Bathrooms",label:"Stage hand towels: clean, folded evenly, and centered",done:false},
      {id:"t32",section:"Bathrooms",label:"Sanitize light switches, door handles — wipe wall marks",done:false},
      {id:"t33",section:"Bathrooms",label:"Vacuum and mop floors — check corners and edges for hair",done:false},
      {id:"t34",section:"Bathrooms",label:"FINAL CHECK: Would you confidently shower and leave your items here?",done:false},
      {id:"t35",section:"Bedrooms",label:"Strip all beds — bag all used linens separately",done:false},
      {id:"t36",section:"Bedrooms",label:"Remake beds: sheets tight and wrinkle-free, pillows fluffed and squared",done:false},
      {id:"t37",section:"Bedrooms",label:"Check mattress fully covered — no hair on bedding or headboard",done:false},
      {id:"t38",section:"Bedrooms",label:"Dust all surfaces: headboard, nightstands, dressers, lamps, mirrors",done:false},
      {id:"t39",section:"Bedrooms",label:"Open all drawers and closets — check for guest items or debris",done:false},
      {id:"t40",section:"Bedrooms",label:"Sanitize light switches — wipe any wall marks",done:false},
      {id:"t41",section:"Bedrooms",label:"Vacuum floors thoroughly — including under-bed area and closet floor",done:false},
      {id:"t42",section:"Bedrooms",label:"Dust windowsills, blinds, and straighten curtains",done:false},
      {id:"t43",section:"Bedrooms",label:"FINAL CHECK: Would you sleep here tonight?",done:false},
      {id:"t44",section:"Patio & Outdoor",label:"Remove all trash, food residue, cups, or debris",done:false},
      {id:"t45",section:"Patio & Outdoor",label:"Sweep all walking areas — check for safety hazards",done:false},
      {id:"t46",section:"Patio & Outdoor",label:"Wipe furniture: tables, chairs, armrests, cushions",done:false},
      {id:"t47",section:"Patio & Outdoor",label:"Clean and cover grill — check propane is off",done:false},
      {id:"t48",section:"Patio & Outdoor",label:"Arrange furniture neatly per staging guide",done:false},
      {id:"t49",section:"Patio & Outdoor",label:"FINAL CHECK: Would guests feel comfortable relaxing here immediately?",done:false},
      {id:"t50",section:"Departure",label:"Full walkthrough completed as a guest",done:false},
      {id:"t51",section:"Departure",label:"All room standards passed: Kitchen, Bath, Bedrooms, Living Areas",done:false},
      {id:"t52",section:"Departure",label:"No missed hair, crumbs, odors, or staging issues",done:false},
      {id:"t53",section:"Departure",label:"All linens clean, folded, and stored properly",done:false},
      {id:"t54",section:"Departure",label:"Dishwasher empty",done:false},
      {id:"t55",section:"Departure",label:"Washer door cracked open",done:false},
      {id:"t56",section:"Departure",label:"Dryer lint trap cleaned",done:false},
      {id:"t57",section:"Departure",label:"Trash removed to exterior bins",done:false},
      {id:"t58",section:"Departure",label:"Thermostat set to host standard (Heat/AC: 73°)",done:false},
      {id:"t59",section:"Departure",label:"Ceiling fans set to low",done:false},
      {id:"t60",section:"Departure",label:"Overhead lights off",done:false},
      {id:"t61",section:"Departure",label:"Porch / exterior lights on",done:false},
      {id:"t62",section:"Departure",label:"Supply closets locked",done:false},
      {id:"t63",section:"Departure",label:"All exterior doors and windows locked",done:false},
      {id:"t64",section:"Departure",label:"Keys returned to proper location",done:false},
      {id:"t65",section:"Departure",label:"✅ I approve this unit for immediate guest check-in",done:false},
    ],
  },
];

const POLICIES = [
  {num:"1",title:"Mission Statement",content:"Harvey's Professional Cleaning LLC is committed to delivering exceptional, 5-star guest experiences with every cleaning service. These standards ensure consistent, high-quality service across all properties and team members. Every cleaner is an ambassador of this brand.",items:[]},
  {num:"2",title:"Professional Communication Standards",content:"",items:[
    "Maintain professional and courteous communication with all clients, guests, and team members at all times.",
    "Check messages before departing for assignments and immediately after completion.",
    "Respond promptly to all communications from Mr. Harvey.",
    "Notify Mr. Harvey IMMEDIATELY if you will be late or unable to fulfill an assignment — no exceptions.",
    "Report property issues, damage, or concerns as soon as they are identified.",
    "Do not discuss property details, guest information, or company business on social media or with unauthorized persons.",
  ]},
  {num:"3",title:"Scheduling and Punctuality",content:"Punctuality is non-negotiable. Same-day turnovers leave no room for delays.",items:[
    "Arrive on time for all scheduled assignments.",
    "Default start time is 11:00 AM unless otherwise specified by management.",
    "If you are running late, contact Mr. Harvey before your scheduled start time.",
    "No-call, no-show to an assignment is grounds for immediate removal from the schedule.",
  ]},
  {num:"4",title:"Pre-Cleaning Documentation Protocol",content:"This step is required before touching anything in the property.",items:[
    "Step 1 — Initial Walkthrough: Conduct a comprehensive inspection of the entire property before beginning any work.",
    "Step 2 — Video Documentation: Record a 30-60 second video showing overall cleanliness, any existing damage, and notable concerns.",
    "Step 3 — Condition Rating: Rate the property condition using the app's Guest Condition Rating before starting.",
    "Step 4 — Submission: Send the video and rating to Mr. Harvey via the app BEFORE starting the cleaning process.",
    "Failure to complete pre-cleaning documentation may result in the cleaner being held liable for pre-existing damage.",
  ]},
  {num:"5",title:"Comprehensive Cleaning Standards",content:"Each turnover requires a complete, thorough cleaning of the entire property following the standard checklist.",items:[
    "All Rooms: Dust all surfaces including ledges, shelves, baseboards, ceiling fans, blinds, and windowsills. Vacuum or sweep all floors.",
    "Bathrooms: Clean and disinfect toilets, sinks, showers, and tubs. Clean mirrors and polish fixtures. Replace towels, bathmats, and toiletries.",
    "Kitchen: Clean and sanitize all countertops. Wipe down all appliances inside and out. Clean sink, faucet, and drains.",
    "Bedrooms: Remove all used linens. Replace with fresh clean linens. Make beds to property standards. Dust all furniture.",
    "Living Areas: Dust all surfaces. Wipe light switches, remotes, and door handles. Vacuum and mop floors.",
    "High-Touch Sanitization: Disinfect all doorknobs, light switches, remote controls, cabinet handles, and frequently touched surfaces.",
    "Supply Management: Verify and restock all essential items including toilet paper, towels, toiletries, trash bags, and kitchen basics.",
  ]},
  {num:"6",title:"Post-Cleaning Documentation Protocol",content:"Required before leaving the property. This protects you and the company.",items:[
    "Step 1 — Final Walkthrough: Conduct a thorough room-by-room inspection after cleaning is complete.",
    "Step 2 — Video Documentation: Record a comprehensive video showing all rooms, fresh linens, clean floors, and sanitized bathrooms.",
    "Step 3 — Submission: Upload the post-cleaning video through the app and submit for approval BEFORE leaving the property.",
    "Do not leave the property until documentation is submitted.",
  ]},
  {num:"7",title:"Quality Assurance Standards",content:"",items:[
    "Treat every property as if it were your own home being prepared for your family.",
    "Never rush through assignments. Quality over speed, every time.",
    "Take pride in delivering thorough, meticulous work on every job.",
    "When in doubt about quality, double-check or consult Mr. Harvey before departing.",
    "A job is not complete until it meets 5-star standards. Period.",
  ]},
  {num:"8",title:"Incident Reporting Procedures",content:"Report everything. It is always better to over-report than to under-report.",items:[
    "Damage and Property Issues: Report any broken items, stains, leaks, or damage immediately with photo or video evidence.",
    "Guest Items: Report and secure any items left behind by guests. Do NOT dispose of, remove, or keep any guest property.",
    "Odor Detection: Report any smoke, cannabis, or other odors immediately upon arrival BEFORE beginning cleaning.",
    "Pest or Safety Issues: Report any signs of pests, mold, structural damage, or safety hazards immediately.",
    "Failure to report known damage before cleaning may result in the cleaner being held responsible for that damage.",
  ]},
  {num:"9",title:"Performance Standards and Corrective Actions",content:"All work must meet established 5-star standards without exception.",items:[
    "Correction Visits: Cleaners may be required to return to address quality issues at no additional compensation.",
    "Pay Reduction: A 20-50% pay reduction may apply for significant quality failures depending on issue severity.",
    "Schedule Removal: Repeated failure to meet standards will result in permanent removal from the schedule.",
    "Zero Tolerance: Theft, dishonesty, property damage through negligence, or misconduct results in immediate termination and may be reported to authorities.",
  ]},
  {num:"10",title:"Payment Terms",content:"",items:[
    "Payment is processed within 48 hours after cleaning completion and approval.",
    "Payment is released after property owner inspection approval OR successful guest check-in confirmation.",
    "Payment Holds: Payment may be delayed or adjusted when property damage is reported, items are missing, or quality does not meet standards.",
    "Pay adjustments for quality failures: 20-50% reduction depending on severity.",
    "Cleaners are responsible for their own tax obligations. Harvey's Professional Cleaning LLC is not responsible for cleaner tax filings.",
    "Direct deposit via Stripe. Cleaners must maintain an active, verified bank account on file.",
  ]},
  {num:"11",title:"Professional Conduct and Additional Standards",content:"Standards that protect you, the clients, and the company.",items:[
    "Dress Code: Arrive in clean, professional attire. No offensive graphics, torn clothing, or strong fragrances.",
    "Phone Use: Limit personal phone use during cleaning. Phones should be used for documentation and communication only.",
    "Social Media: Do not post photos or videos of client properties without written permission from Mr. Harvey.",
    "Confidentiality: All client information, property addresses, access codes, and business details are strictly confidential.",
    "Respect for Property: Handle all client property with care. Do not use client amenities or bring unauthorized persons to assignments.",
    "Substance Policy: Arriving to an assignment under the influence of alcohol or drugs is grounds for immediate termination.",
  ]},
  {num:"12",title:"Agreement and Acknowledgment",content:"By accepting assignments with Harvey's Professional Cleaning LLC, all team members agree to:",items:[
    "Follow all policies and procedures outlined in this document.",
    "Use the standard property checklist for every assignment without exception.",
    "Document pre-cleaning and post-cleaning conditions thoroughly on every job.",
    "Maintain clear, timely communication with Mr. Harvey at all times.",
    "Report all issues and concerns promptly through the proper channels.",
    "Consistently deliver 5-star quality service on every property, every time.",
    "These standards apply to all cleaning staff without exception including regular, backup, and substitute personnel.",
    "This policy is effective immediately and supersedes all previous versions.",
  ]},
];

var TEMPLATE_POLICIES = [
  {num:"1",title:"Mission Statement",content:"[YOUR COMPANY NAME] is committed to delivering exceptional, 5-star guest experiences with every cleaning service. These standards ensure consistent, high-quality service across all properties and team members. Every cleaner is an ambassador of this brand.",items:[]},
  {num:"2",title:"Professional Communication Standards",content:"",items:[
    "Maintain professional and courteous communication with all clients, guests, and team members at all times.",
    "Check messages before departing for assignments and immediately after completion.",
    "Respond promptly to all communications from Mr. Harvey.",
    "Notify Mr. Harvey IMMEDIATELY if you will be late or unable to fulfill an assignment — no exceptions.",
    "Report property issues, damage, or concerns as soon as they are identified.",
    "Do not discuss property details, guest information, or company business on social media or with unauthorized persons.",
  ]},
  {num:"3",title:"Scheduling and Punctuality",content:"Punctuality is non-negotiable. Same-day turnovers leave no room for delays.",items:[
    "Arrive on time for all scheduled assignments.",
    "Default start time is 11:00 AM unless otherwise specified by management.",
    "If you are running late, contact Mr. Harvey before your scheduled start time.",
    "No-call, no-show to an assignment is grounds for immediate removal from the schedule.",
  ]},
  {num:"4",title:"Pre-Cleaning Documentation Protocol",content:"This step is required before touching anything in the property.",items:[
    "Step 1 — Initial Walkthrough: Conduct a comprehensive inspection of the entire property before beginning any work.",
    "Step 2 — Video Documentation: Record a 30-60 second video showing overall cleanliness, any existing damage, and notable concerns.",
    "Step 3 — Condition Rating: Rate the property condition using the app's Guest Condition Rating before starting.",
    "Step 4 — Submission: Send the video and rating to Mr. Harvey via the app BEFORE starting the cleaning process.",
    "Failure to complete pre-cleaning documentation may result in the cleaner being held liable for pre-existing damage.",
  ]},
  {num:"5",title:"Comprehensive Cleaning Standards",content:"Each turnover requires a complete, thorough cleaning of the entire property following the standard checklist.",items:[
    "All Rooms: Dust all surfaces including ledges, shelves, baseboards, ceiling fans, blinds, and windowsills. Vacuum or sweep all floors.",
    "Bathrooms: Clean and disinfect toilets, sinks, showers, and tubs. Clean mirrors and polish fixtures. Replace towels, bathmats, and toiletries.",
    "Kitchen: Clean and sanitize all countertops. Wipe down all appliances inside and out. Clean sink, faucet, and drains.",
    "Bedrooms: Remove all used linens. Replace with fresh clean linens. Make beds to property standards. Dust all furniture.",
    "Living Areas: Dust all surfaces. Wipe light switches, remotes, and door handles. Vacuum and mop floors.",
    "High-Touch Sanitization: Disinfect all doorknobs, light switches, remote controls, cabinet handles, and frequently touched surfaces.",
    "Supply Management: Verify and restock all essential items including toilet paper, towels, toiletries, trash bags, and kitchen basics.",
  ]},
  {num:"6",title:"Post-Cleaning Documentation Protocol",content:"Required before leaving the property. This protects you and the company.",items:[
    "Step 1 — Final Walkthrough: Conduct a thorough room-by-room inspection after cleaning is complete.",
    "Step 2 — Video Documentation: Record a comprehensive video showing all rooms, fresh linens, clean floors, and sanitized bathrooms.",
    "Step 3 — Submission: Upload the post-cleaning video through the app and submit for approval BEFORE leaving the property.",
    "Do not leave the property until documentation is submitted.",
  ]},
  {num:"7",title:"Quality Assurance Standards",content:"",items:[
    "Treat every property as if it were your own home being prepared for your family.",
    "Never rush through assignments. Quality over speed, every time.",
    "Take pride in delivering thorough, meticulous work on every job.",
    "When in doubt about quality, double-check or consult Mr. Harvey before departing.",
    "A job is not complete until it meets 5-star standards. Period.",
  ]},
  {num:"8",title:"Incident Reporting Procedures",content:"Report everything. It is always better to over-report than to under-report.",items:[
    "Damage and Property Issues: Report any broken items, stains, leaks, or damage immediately with photo or video evidence.",
    "Guest Items: Report and secure any items left behind by guests. Do NOT dispose of, remove, or keep any guest property.",
    "Odor Detection: Report any smoke, cannabis, or other odors immediately upon arrival BEFORE beginning cleaning.",
    "Pest or Safety Issues: Report any signs of pests, mold, structural damage, or safety hazards immediately.",
    "Failure to report known damage before cleaning may result in the cleaner being held responsible for that damage.",
  ]},
  {num:"9",title:"Performance Standards and Corrective Actions",content:"All work must meet established 5-star standards without exception.",items:[
    "Correction Visits: Cleaners may be required to return to address quality issues at no additional compensation.",
    "Pay Reduction: A 20-50% pay reduction may apply for significant quality failures depending on issue severity.",
    "Schedule Removal: Repeated failure to meet standards will result in permanent removal from the schedule.",
    "Zero Tolerance: Theft, dishonesty, property damage through negligence, or misconduct results in immediate termination and may be reported to authorities.",
  ]},
  {num:"10",title:"Payment Terms",content:"",items:[
    "Payment is processed within 48 hours after cleaning completion and approval.",
    "Payment is released after property owner inspection approval OR successful guest check-in confirmation.",
    "Payment Holds: Payment may be delayed or adjusted when property damage is reported, items are missing, or quality does not meet standards.",
    "Pay adjustments for quality failures: 20-50% reduction depending on severity.",
    "Cleaners are responsible for their own tax obligations. [YOUR COMPANY NAME] is not responsible for cleaner tax filings.",
    "Direct deposit via Stripe. Cleaners must maintain an active, verified bank account on file.",
  ]},
  {num:"11",title:"Professional Conduct and Additional Standards",content:"Standards that protect you, the clients, and the company.",items:[
    "Dress Code: Arrive in clean, professional attire. No offensive graphics, torn clothing, or strong fragrances.",
    "Phone Use: Limit personal phone use during cleaning. Phones should be used for documentation and communication only.",
    "Social Media: Do not post photos or videos of client properties without written permission from Mr. Harvey.",
    "Confidentiality: All client information, property addresses, access codes, and business details are strictly confidential.",
    "Respect for Property: Handle all client property with care. Do not use client amenities or bring unauthorized persons to assignments.",
    "Substance Policy: Arriving to an assignment under the influence of alcohol or drugs is grounds for immediate termination.",
  ]},
  {num:"12",title:"Agreement and Acknowledgment",content:"By accepting assignments with [YOUR COMPANY NAME], all team members agree to:",items:[
    "Follow all policies and procedures outlined in this document.",
    "Use the standard property checklist for every assignment without exception.",
    "Document pre-cleaning and post-cleaning conditions thoroughly on every job.",
    "Maintain clear, timely communication with Mr. Harvey at all times.",
    "Report all issues and concerns promptly through the proper channels.",
    "Consistently deliver 5-star quality service on every property, every time.",
    "These standards apply to all cleaning staff without exception including regular, backup, and substitute personnel.",
    "This policy is effective immediately and supersedes all previous versions.",
  ]},
];

const INIT_CLEANERS = [
  {id:"c1",name:"Maria Santos",email:"maria@turnready.app",phone:"(555) 010-0001",password:"clean123",totalEarned:1240,jobsCompleted:14,rating:4.9,avatar:"MS",role:"primary",stripeStatus:"connected",stripeAccount:"acct_demo_c1",reviews:[
    {rating:5,comment:"Absolutely spotless. Guest left a 5-star review mentioning cleanliness specifically.",property:"Oceanview Villa",date:"2026-06-10T14:00:00.000Z"},
    {rating:5,comment:"Perfect staging on all rooms. Exactly what we expect.",property:"Downtown Loft",date:"2026-06-05T11:00:00.000Z"},
    {rating:4,comment:"Good work overall. Missed one item under the bed but otherwise great.",property:"Oceanview Villa",date:"2026-05-28T12:00:00.000Z"},
    {rating:5,comment:"Exceptional. Guest gave us a compliment specifically about the towel arrangement.",property:"Downtown Loft",date:"2026-05-20T10:00:00.000Z"},
  ]},
  {id:"c2",name:"James Kirk",email:"james@turnready.app",phone:"(555) 010-0002",password:"clean123",totalEarned:890,jobsCompleted:10,rating:4.7,avatar:"JK",role:"backup",stripeStatus:"connected",stripeAccount:"acct_demo_c2",reviews:[
    {rating:5,comment:"Great job. Property was guest-ready ahead of schedule.",property:"867 Welch Street",date:"2026-06-08T13:00:00.000Z"},
    {rating:4,comment:"Solid work. Kitchen could use a little more attention next time.",property:"867 Welch Street",date:"2026-05-30T11:00:00.000Z"},
    {rating:5,comment:"James went above and beyond. Guest loved it.",property:"867 Welch Street",date:"2026-05-15T10:00:00.000Z"},
  ]},
  {id:"c3",name:"Priya Nair",email:"priya@turnready.app",phone:"(555) 010-0003",password:"clean123",stripeStatus:"pending",stripeAccount:null,totalEarned:2100,jobsCompleted:22,rating:5.0,avatar:"PN",role:"backup",reviews:[]},
];

const INIT_JOBS = [
  {
    id:"j1",propertyId:"p2",cleanerId:"c1",status:"pending_approval",
    completedAt:"2026-06-03T14:30:00",pay:120,propertyName:"Downtown Loft",
    startedAt:"2026-06-03T12:00:00",
    tasks:[
      {id:"t1",label:"Check for guest left items",done:true},
      {id:"t2",label:"Strip and remake all beds",done:true},
      {id:"t3",label:"Vacuum floors",done:true},
      {id:"t4",label:"Scrub toilets and sinks",done:true},
      {id:"t5",label:"Replace towels and amenities",done:true},
      {id:"t6",label:"Clean stovetop and oven",done:true},
      {id:"t7",label:"Wipe counters and appliances",done:true},
      {id:"t8",label:"Vacuum and dust surfaces",done:false},
      {id:"t9",label:"Take out trash",done:true},
      {id:"t10",label:"Final walkthrough",done:true},
    ],
    inventory:[
      {item:"Bath Towels",status:"full"},
      {item:"Hand Towels",status:"full"},
      {item:"Shampoo",status:"med"},
      {item:"Toilet Paper Rolls",status:"full"},
      {item:"Dish Soap",status:"low"},
      {item:"Trash Bags",status:"full"},
    ],
    uploads:[
      {type:"pre",url:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80",label:"Pre-clean"},
      {type:"post",url:"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80",label:"Post-clean bedroom"},
      {type:"post",url:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80",label:"Post-clean bathroom"},
    ],
    notes:"Guest left some items in closet. Placed in lost and found bag by front door.",
  },
  {
    id:"j2",propertyId:"p1",cleanerId:"c1",status:"pending_approval",
    completedAt:"2026-06-12T11:00:00",pay:185,propertyName:"Oceanview Villa",
    startedAt:"2026-06-12T08:30:00",
    tasks:[
      {id:"t1",label:"Check for guest left items",done:true},
      {id:"t2",label:"Strip and remake all beds",done:true},
      {id:"t3",label:"Vacuum floors",done:true},
      {id:"t4",label:"Scrub toilets and sinks",done:true},
      {id:"t5",label:"Replace towels and amenities",done:true},
      {id:"t6",label:"Clean stovetop and oven",done:true},
      {id:"t7",label:"Wipe counters and appliances",done:true},
      {id:"t8",label:"Vacuum and dust surfaces",done:true},
      {id:"t9",label:"Take out trash",done:true},
      {id:"t10",label:"Final walkthrough",done:true},
    ],
    inventory:[
      {item:"Bath Towels",status:"full"},
      {item:"Hand Towels",status:"full"},
      {item:"Shampoo",status:"full"},
      {item:"Toilet Paper Rolls",status:"full"},
      {item:"Dish Soap",status:"med"},
      {item:"Coffee Pods / Tea",status:"low"},
    ],
    uploads:[
      {type:"pre",url:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80",label:"Pre-clean living room"},
      {type:"post",url:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80",label:"Post-clean bedroom"},
      {type:"post",url:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&q=80",label:"Post-clean kitchen"},
      {type:"post",url:"https://images.unsplash.com/photo-1620626011761-996317702782?w=400&q=80",label:"Post-clean bathroom"},
    ],
    notes:"All tasks completed. Property is guest ready.",
  },
  {
    id:"j3",propertyId:"p3",cleanerId:"c2",status:"pending_approval",
    completedAt:"2026-06-11T13:45:00",pay:150,propertyName:"867 Welch Street",
    startedAt:"2026-06-11T11:00:00",
    tasks:[
      {id:"t1",label:"Check for guest left items",done:true},
      {id:"t2",label:"Strip and remake all beds",done:true},
      {id:"t3",label:"Vacuum floors",done:true},
      {id:"t4",label:"Scrub toilets and sinks",done:true},
      {id:"t5",label:"Replace towels and amenities",done:true},
      {id:"t6",label:"Clean stovetop and oven",done:false},
      {id:"t7",label:"Wipe counters and appliances",done:true},
      {id:"t8",label:"Vacuum and dust surfaces",done:true},
      {id:"t9",label:"Take out trash",done:true},
      {id:"t10",label:"Final walkthrough",done:true},
    ],
    inventory:[
      {item:"Bath Towels",status:"full"},
      {item:"Hand Towels",status:"med"},
      {item:"Shampoo",status:"low"},
      {item:"Toilet Paper Rolls",status:"full"},
      {item:"Dish Soap",status:"full"},
      {item:"Trash Bags",status:"med"},
    ],
    uploads:[
      {type:"pre",url:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",label:"Pre-clean"},
      {type:"post",url:"https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&q=80",label:"Post-clean living room"},
      {type:"post",url:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80",label:"Post-clean kitchen"},
    ],
    notes:"Oven needs extra attention - left note for manager.",
  },
];

const ACCOUNTS = [
  {email:"manager@turnready.app",password:"admin123",name:"Alex Johnson",role:"manager"},
  {email:"maria@turnready.app",password:"clean123",name:"Maria Santos",role:"cleaner",id:"c1"},
  {email:"james@turnready.app",password:"clean123",name:"James Kirk",role:"cleaner",id:"c2"},
  {email:"priya@turnready.app",password:"clean123",name:"Priya Nair",role:"cleaner",id:"c3"},
];

const FAQS = [
  {q:"How do I add a new property?",a:"Go to Properties tab → click '+ Add Property'. Fill in name, address, type, pay rate, bedrooms/bathrooms, and upload a photo. You can then add tasks, rooms, and staging guides."},
  {q:"How does the approval and payment system work?",a:"When a cleaner marks a job complete, you receive a notification under Approvals. Review the job, then click Approve & Pay. The cleaner is automatically paid via Stripe to their bank account."},
  {q:"Can cleaners see each other's assignments?",a:"No. Each cleaner only sees properties and jobs assigned to them. Your business data stays private."},
  {q:"How do I assign a job to a cleaner?",a:"Open a property → click 'Assign Job' → select the cleaner, date, and time → save. The cleaner will see it immediately when they log in."},
  {q:"What happens if a cleaner doesn't complete all tasks?",a:"The app prevents submission until every checklist item is checked off. This ensures no step is skipped."},
  {q:"Can I add my own staging photos and videos?",a:"Yes! Each room has a staging guide section where you can upload photos and short video clips to show exactly how each area should look when finished."},
  {q:"What does the AI assistant help with?",a:"The HostReady AI can answer questions about cleaning protocols, staging tips, guest experience best practices, Airbnb hosting advice, and how to use the app."},
  {q:"Is my data secure?",a:"All data is encrypted. Cleaner logins are separate from manager accounts and cannot access financial or business data."},
];

// ─── STYLES ──────────────────────────────────────────────────────────────────
var css = "\n  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap');\n  *{box-sizing:border-box;margin:0;padding:0;}\n  body{background:#0D0D0D;color:#FFFFFF;font-family:'Inter', sans-serif;-webkit-font-smoothing:antialiased;}\n  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:#141414;}\n  ::-webkit-scrollbar-thumb{background:#2A2A2A;border-radius:2px;}\n\n  .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:#CC0000;color:#FFFFFF;border:none;border-radius:8px;padding:11px 22px;font-family:'Inter', sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:all .2s;letter-spacing:.2px;}\n  .btn:hover{background:#FF1111;transform:translateY(-1px);box-shadow:0 4px 20px rgba(204,0,0,.4);}\n  .btn.ghost{background:transparent;border:1.5px solid #2A2A2A;color:#E8E8E8;}\n  .btn.ghost:hover{border-color:#CC0000;color:#FFFFFF;background:rgba(204,0,0,0.08);box-shadow:none;}\n  .btn.sm{padding:7px 14px;font-size:12px;border-radius:6px;}\n  .btn.danger{background:#EF4444;}\n  .btn.success{background:#22C55E;color:#000;}\n\n  .card{background:var(--card-bg,#1A1A1A);border:1px solid var(--card-border,#2A2A2A);border-radius:14px;padding:20px;transition:background .2s,border-color .2s;}\n  .card.hover:hover{border-color:#CC000044;cursor:pointer;}\n\n  input,select,textarea{background:var(--input-bg,#141414);border:1px solid var(--input-border,#2A2A2A);color:var(--input-color,#FFFFFF);border-radius:8px;padding:10px 13px;font-family:'Inter', sans-serif;font-size:13px;outline:none;width:100%;transition:border-color .2s;}\n  input:focus,select:focus,textarea:focus{border-color:#CC0000;}\n  select option{background:#1A1A1A;}\n  label{font-size:11px;color:var(--label-color,#888888);font-weight:500;letter-spacing:.5px;margin-bottom:5px;display:block;text-transform:uppercase;}\n  textarea{resize:vertical;min-height:80px;}\n\n  .tab{padding:8px 16px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:500;transition:all .2s;color:#888888;border:none;background:none;font-family:'Inter', sans-serif;}\n  .tab.on{background:rgba(204,0,0,0.15);color:#CC0000;}\n  .tab:hover:not(.on){color:#FFFFFF;}\n\n  .badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;}\n  .green{background:rgba(34,197,94,.15);color:#22C55E;}\n  .amber{background:rgba(245,158,11,.15);color:#F59E0B;}\n  .red-b{background:rgba(204,0,0,.2);color:#FF6666;}\n  .gray{background:rgba(136,136,136,.15);color:#888888;}\n\n  .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(6px);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}\n  .modal{background:#1A1A1A;border:1px solid #2A2A2A;border-radius:18px;padding:28px;width:100%;max-width:580px;max-height:90vh;overflow-y:auto;}\n\n  .cb-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:background .15s;}\n  .cb-row:hover{background:#141414;}\n  .cb{width:20px;height:20px;border-radius:5px;border:2px solid #2A2A2A;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;}\n  .cb.on{background:#CC0000;border-color:#CC0000;}\n\n  .avatar{width:36px;height:36px;border-radius:50%;background:rgba(204,0,0,0.15);border:1.5px solid #CC0000;color:#CC0000;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;}\n\n  .prog-bar{height:4px;background:#2A2A2A;border-radius:2px;overflow:hidden;}\n  .prog-fill{height:100%;background:#CC0000;border-radius:2px;transition:width .4s;}\n\n  .stat-card{background:#1A1A1A;border:1px solid #2A2A2A;border-radius:12px;padding:16px;flex:1;min-width:120px;}\n\n  .notif-dot{width:8px;height:8px;background:#CC0000;border-radius:50%;display:inline-block;margin-left:5px;animation:pulse 1.5s infinite;}\n  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}\n\n  .section-header{font-size:13px;color:#CC0000;text-transform:uppercase;letter-spacing:1.5px;font-weight:900;padding:16px 12px 8px;margin-top:6px;}\n\n  .inv-row{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid #2A2A2A;}\n  .inv-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}\n\n  .faq-item{border-bottom:1px solid #2A2A2A;overflow:hidden;}\n  .faq-q{display:flex;justify-content:space-between;align-items:center;padding:16px;cursor:pointer;font-weight:500;font-size:14px;transition:color .2s;}\n  .faq-q:hover{color:#CC0000;}\n  .faq-a{padding:0 16px 16px;color:#888888;font-size:13px;line-height:1.7;}\n\n  .chat-bubble{max-width:80%;padding:11px 15px;border-radius:12px;font-size:13px;line-height:1.6;margin:4px 0;}\n  .chat-bubble.user{background:#CC0000;color:#FFFFFF;border-radius:12px 12px 3px 12px;margin-left:auto;}\n  .chat-bubble.ai{background:#141414;color:#E8E8E8;border-radius:12px 12px 12px 3px;border:1px solid #2A2A2A;}\n\n  .cal-day{width:34px;height:34px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;transition:all .15s;}\n  .cal-day:hover{background:#2A2A2A;}\n  .cal-day.has-job{background:rgba(204,0,0,0.15);color:#CC0000;font-weight:700;}\n  .cal-day.today{border:1.5px solid #CC0000;}\n\n  .room-card{background:#141414;border:1px solid #2A2A2A;border-radius:11px;padding:14px;cursor:pointer;transition:all .2s;}\n  .room-card:hover{border-color:#CC0000;background:#1A1A1A;}\n\n  .glow-line{height:1px;background:linear-gradient(90deg,transparent,#CC0000,transparent);margin:24px 0;}\n";


// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(n){return "$"+Number(n).toFixed(2);}
const MANAGER_ACCOUNT={id:"mgr1",name:"Harvey Johnson",businessName:"Harvey's Professional Cleaning",email:"manager@turnready.app",password:"admin123",role:"manager",avatar:"AJ",plan:"pro",stripeBusinessStatus:"connected",stripeBusinessAccount:"acct_harvey_demo"};
function initials(n){return n.split(" ").map(w=>w[0]).join("").toUpperCase();}
function pct(tasks){var d=tasks.filter(t=>t.done).length;return tasks.length?Math.round(d/tasks.length*100):0;}

// ─── AI CHAT ─────────────────────────────────────────────────────────────────
function AIChat({onClose,user}){
  var storageKey="turnready_ai_"+(user?user.id:"guest");
  var savedMsgs=[];
  try{
    var stored=localStorage.getItem(storageKey);
    if(stored)savedMsgs=JSON.parse(stored);
  }catch(e){}

  const [msgs,setMsgs]=useState(savedMsgs.length>0?savedMsgs:[{role:"ai",text:"Hi! I'm the TurnReady AI assistant. Ask me anything about cleaning protocols, staging tips, Airbnb hosting, or how to use this app. 🧹"}]);
  const [input,setInput]=useState("");
  const [mediaPreview,setMediaPreview]=useState(null); // {url, type:'image'|'video', name}
  const [loading,setLoading]=useState(false);
  const endRef=useRef(null);

  useEffect(function(){
    if(endRef.current)endRef.current.scrollIntoView({behavior:"smooth"});
  },[msgs]);

  function saveMsgs(newMsgs){
    try{localStorage.setItem(storageKey,JSON.stringify(newMsgs.slice(-50)));}catch(e){}
  }

  async function send(){
    if((!input.trim()&&!mediaPreview)||loading)return;
    var q=input.trim();
    var userMsg={role:"user",text:q,media:mediaPreview?{url:mediaPreview.url,type:mediaPreview.type,name:mediaPreview.name}:null};
    var newMsgs=msgs.concat([userMsg]);
    setMsgs(newMsgs);
    saveMsgs(newMsgs);
    setInput(""); setMediaPreview(null);
    setLoading(true);
    var userContent=mediaPreview&&mediaPreview.type==="image"?[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:mediaPreview.url.split(",")[1]||""}},{type:"text",text:q||"What do you see? Give cleaning advice."}]:q;
    try{
      var res=await fetch("/api/ai",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          messages:[{role:"user",content:typeof userContent==="string"?userContent:userContent}]
        })
      });
      var d=await res.json();
      if(!res.ok||d.error){throw new Error(d.error||"API error "+res.status);}
      var text=d.text||"Sorry, I could not get a response.";
      var finalMsgs=newMsgs.concat([{role:"ai",text:text}]);
      setMsgs(finalMsgs);
      saveMsgs(finalMsgs);
    }catch(e){
      var errText="Sorry, I had trouble connecting. Error: "+e.message;
      var errMsgs=newMsgs.concat([{role:"ai",text:errText}]);
      setMsgs(errMsgs);
      saveMsgs(errMsgs);
    }
    setLoading(false);
  }

  return(
    <div style={{position:"fixed",inset:0,background:"#0D0D0D",zIndex:400,display:"flex",flexDirection:"column",fontFamily:"Inter,sans-serif"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:"1px solid #2A2A2A",background:"#141414",flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🤖</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:15,fontWeight:900,letterSpacing:.5}}>TURNREADY AI</div>
          <div style={{fontSize:11,color:"#22C55E",marginTop:1}}>● Online — Ask me anything</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={function(){try{localStorage.removeItem(storageKey);}catch(e){}setMsgs([{role:"ai",text:"Chat cleared! How can I help you?"}]);}}
            style={{background:"transparent",border:"1px solid #333",borderRadius:6,color:"#555",fontSize:10,padding:"5px 8px",cursor:"pointer"}}>Clear</button>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#888",fontSize:24,cursor:"pointer",lineHeight:1,padding:"4px"}}>×</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:12,WebkitOverflowScrolling:"touch"}}>
        {msgs.map(function(m,i){
          var isUser=m.role==="user";
          return(
            <div key={i} style={{display:"flex",justifyContent:isUser?"flex-end":"flex-start",alignItems:"flex-end",gap:8}}>
              {!isUser&&<div style={{width:28,height:28,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,marginBottom:2}}>🤖</div>}
              <div style={{
                maxWidth:"78%",
                background:isUser?"#CC0000":"#1A1A1A",
                borderRadius:isUser?"16px 16px 4px 16px":"16px 16px 16px 4px",
                padding:"10px 14px",
                boxShadow:"0 2px 8px rgba(0,0,0,.3)"
              }}>
                <div>{m.media&&m.media.type==="image"&&<img src={m.media.url} style={{maxWidth:"100%",maxHeight:180,borderRadius:8,marginBottom:m.text?6:0,display:"block"}}/>}{m.media&&m.media.type==="video"&&<video src={m.media.url} controls style={{maxWidth:"100%",maxHeight:160,borderRadius:8,marginBottom:m.text?6:0,display:"block"}}/>}{m.text&&<div style={{fontSize:13,color:"#FFF",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{m.text}</div>}</div>
              </div>
            </div>
          );
        })}
        {loading&&(
          <div style={{display:"flex",justifyContent:"flex-start",alignItems:"flex-end",gap:8}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🤖</div>
            <div style={{background:"#1A1A1A",borderRadius:"16px 16px 16px 4px",padding:"12px 16px"}}>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#CC0000",animation:"pulse 1s infinite"}}/>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#CC0000",animation:"pulse 1s infinite .2s"}}/>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#CC0000",animation:"pulse 1s infinite .4s"}}/>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Input bar */}
      <div style={{padding:"12px 16px",borderTop:"1px solid #2A2A2A",background:"#141414",display:"flex",gap:10,alignItems:"center",flexShrink:0,paddingBottom:"max(12px,env(safe-area-inset-bottom))"}}>
        {mediaPreview&&(
          <div style={{position:"relative",marginBottom:8,display:"inline-block",maxWidth:"60%"}}>
            {mediaPreview.type==="image"?<img src={mediaPreview.url} style={{maxHeight:80,borderRadius:8,display:"block"}}/>:<video src={mediaPreview.url} style={{maxHeight:80,borderRadius:8,display:"block"}}/>}
            <button onClick={function(){setMediaPreview(null);}} style={{position:"absolute",top:3,right:3,background:"rgba(0,0,0,.8)",border:"none",borderRadius:"50%",width:20,height:20,color:"#FFF",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>x</button>
          </div>
        )}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <label style={{width:38,height:38,borderRadius:"50%",background:"#1A1A1A",border:"1px solid #2A2A2A",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:17}}>
            📎
            <input type="file" accept="image/*,video/*" capture="environment" style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}} onChange={function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){setMediaPreview({url:ev.target.result,type:file.type.startsWith("video")?"video":"image",name:file.name});};reader.readAsDataURL(file);e.target.value="";}}/>
          </label>
          <input value={input} onChange={function(e){setInput(e.target.value);}}
            onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder="Ask me anything... or attach a photo"
            style={{flex:1,background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:22,padding:"11px 16px",color:"#FFF",fontSize:14,outline:"none",fontFamily:"Inter,sans-serif"}}/>
          <button onClick={send} disabled={loading||(!input.trim()&&!mediaPreview)} style={{width:44,height:44,borderRadius:"50%",border:"none",color:"#FFF",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:(!loading&&(input.trim()||mediaPreview))?"#CC0000":"#2A2A2A"}}>{loading?"...":"→"}</button>
        </div>
      </div>
    </div>
  );
}


function Login({onLogin,cleaners,setCleaners,pending,setPending,inviteCode}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [pwd,setPwd]=useState("");
  const [pwd2,setPwd2]=useState("");
  const [showPwd,setShowPwd]=useState(false);
  const [bioSupported,setBioSupported]=useState(false);
  const [bioError,setBioError]=useState("");
  const [name,setName]=useState("");
  const [name2,setName2]=useState("");
  const [phone,setPhone]=useState("");
  const [err,setErr]=useState("");

  // Check if WebAuthn/biometric is supported
  React.useEffect(function(){
    if(window.PublicKeyCredential){
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(function(available){setBioSupported(available);})
        .catch(function(){setBioSupported(false);});
    }
  },[]);

  function handleBiometric(){
    // Use WebAuthn to authenticate - falls back gracefully if not set up
    if(!window.PublicKeyCredential){setBioError("Biometrics not supported on this device.");return;}
    // Check if there's a saved credential for biometric login
    var savedEmail=localStorage.getItem("turnready_bio_email");
    var savedPwd=localStorage.getItem("turnready_bio_pwd");
    if(!savedEmail||!savedPwd){
      setBioError("Set up biometrics by logging in normally first, then enable it in My Profile.");
      return;
    }
    // Trigger platform authenticator (Face ID / fingerprint)
    navigator.credentials.get({
      publicKey:{
        challenge:new Uint8Array(32),
        timeout:60000,
        userVerification:"required",
        rpId:window.location.hostname||"localhost",
      }
    }).then(function(){
      // Biometric verified - auto-fill and login
      setEmail(savedEmail);
      setPwd(savedPwd);
      setTimeout(function(){go();},100);
    }).catch(function(e){
      // Fallback: just try stored creds if biometric dismissed
      if(savedEmail&&savedPwd){
        setEmail(savedEmail);
        setPwd(savedPwd);
        setTimeout(function(){go();},100);
      } else {
        setBioError("Biometric failed. Please log in manually.");
      }
    });
  }
  const [loading,setLoading]=useState(false);
  const [showForgot,setShowForgot]=useState(false);
  const [signupDone,setSignupDone]=useState(false);
  const [inviteInput,setInviteInput]=useState("");
  const [showTos,setShowTos]=useState(false);
  const [showTosRead,setShowTosRead]=useState(false);
  const [tosOk,setTosOk]=useState(function(){
    try{return localStorage.getItem("turnready_tos")==="agreed";}catch(e){return false;}
  });

  function agreeToTos(){
    try{localStorage.setItem("turnready_tos","agreed");}catch(e){}
    setTosOk(true);
    setShowTos(false);
  }

  async function doLogin(){
    if(!email.trim()||!pwd.trim()){setErr("Please enter your email and password.");return;}
    setLoading(true);setErr("");
    try{
      // Try Supabase auth first
      var data=await signIn({email:email.trim(),password:pwd});
      var profile=await getCurrentUser();
      if(!profile){setErr("Account not found. Please contact your manager.");setLoading(false);return;}
      try{
        localStorage.setItem("turnready_bio_email",email);
        localStorage.setItem("turnready_bio_pwd",pwd);
        localStorage.setItem("turnready_is_real_user","true");
      }catch(e){}
      setLoading(false);
      // Map DB field names to app field names
      var mappedProfile=Object.assign({},profile,{
        stripeStatus:profile.stripe_status||"pending",
        stripeAccount:profile.stripe_account_id||null,
        stripeBusinessStatus:profile.stripe_business_status||"not_connected",
        stripeBusinessAccount:profile.stripe_business_account||null,
        businessName:profile.business_name||null,
        totalEarned:profile.total_earned||0,
        jobsCompleted:profile.jobs_completed||0,
        joinedAt:profile.joined_at||profile.created_at,
        photo:profile.photo||null,
        avatar:profile.avatar||null,
        businessPhone:profile.business_phone||null,
        businessAddress:profile.business_address||null,
        emergency:profile.emergency||null,
      });
      onLogin(mappedProfile);
    }catch(e){
      // Fall back to demo accounts if Supabase fails
      if(email===MANAGER_ACCOUNT.email&&pwd===MANAGER_ACCOUNT.password){
        setErr("");setLoading(false);
        try{localStorage.setItem("turnready_bio_email",email);localStorage.setItem("turnready_bio_pwd",pwd);}catch(ex){}
        onLogin(MANAGER_ACCOUNT);return;
      }
      var cl=(cleaners||[]).find(function(c){return c.email===email.trim().toLowerCase()&&c.password===pwd;});
      if(cl){setErr("");setLoading(false);onLogin({...cl,role:"cleaner"});return;}
      setLoading(false);
      setErr(e.message||"Invalid email or password. Please try again.");
    }
  }

  var badge=<div style={{textAlign:"center",marginBottom:24}}>
    <div style={{display:"inline-block",background:"#CC0000",color:"#FFF",fontSize:10,fontWeight:800,letterSpacing:2,padding:"5px 14px",borderRadius:20,marginBottom:12,fontFamily:"Inter,sans-serif"}}>🧹 PRO CLEANING APP</div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:8}}>
      <span style={{fontFamily:"Arial Black,Impact,sans-serif",fontSize:"clamp(32px, 9vw, 60px)",fontWeight:900,letterSpacing:0,color:"#FFF",lineHeight:1}}>TURN</span>
      <span style={{fontFamily:"Arial Black,Impact,sans-serif",fontSize:"clamp(32px, 9vw, 60px)",fontWeight:900,letterSpacing:0,color:"#CC0000",lineHeight:1}}>READY</span>
    </div>
    <div style={{marginTop:14}}>
      <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:6}}>
        {["Assign Jobs","Track Cleans"].map(function(item){return(
          <span key={item} style={{fontSize:10,fontWeight:600,color:"#CCC",background:"#1E1E1E",border:"1px solid #333",borderRadius:20,padding:"4px 12px",letterSpacing:.2}}>{item}</span>
        );})}
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:6}}>
        {["Stage Properties","Pay Your Team"].map(function(item){return(
          <span key={item} style={{fontSize:10,fontWeight:600,color:"#CCC",background:"#1E1E1E",border:"1px solid #333",borderRadius:20,padding:"4px 12px",letterSpacing:.2}}>{item}</span>
        );})}
      </div>
      <div style={{fontSize:10,color:"#FFFFFF",textAlign:"center",letterSpacing:2,fontWeight:700}}>ALL IN ONE PLACE</div>
    </div>
  </div>;

  if(showForgot)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 16px"}}>
      <div style={{width:"100%",maxWidth:380}}>
        {badge}
        <div style={{background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:16,padding:28,marginBottom:16}}>
          <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:18,letterSpacing:1,marginBottom:4}}>RESET PASSWORD</div>
          <div style={{fontSize:12,color:"#888",marginBottom:16}}>Enter your email and we will send you a reset link.</div>
          <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Email Address</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" type="email" style={{marginBottom:16}}/>
          <button className="btn" style={{width:"100%",padding:13}} onClick={()=>{setShowForgot(false);alert("If an account exists for "+email+", a reset link has been sent.");}}>Send Reset Link</button>
        </div>
        <button onClick={()=>{setShowForgot(false);setErr("");}} style={{background:"none",border:"none",color:"#888",fontSize:12,cursor:"pointer",width:"100%",textAlign:"center"}}>← Back to Sign In</button>
      </div>
    </div>
  );

  if(signupDone)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:16}}>✅</div>
      <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:26,letterSpacing:2,marginBottom:10}}>APPLICATION SENT!</div>
      <div style={{fontSize:13,color:"#888",maxWidth:300,lineHeight:1.8,marginBottom:24}}>Your application has been received. The manager will review and approve your account shortly.</div>
      <button className="btn ghost" style={{width:"100%",maxWidth:340}} onClick={()=>{setSignupDone(false);setMode("login");setEmail("");setPwd("");setName("");setPhone("");}}>Back to Login</button>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 16px",fontFamily:"Inter,sans-serif"}}>
      <div style={{width:"100%",maxWidth:380}}>
        {badge}

        {/* Signup cards */}
        {mode==="login"&&<div style={{display:"flex",gap:10,marginBottom:20}}>
          <button onClick={()=>{setMode("signup");setErr("");}} style={{flex:1,padding:"12px 8px",borderRadius:10,border:"1px solid #2A2A2A",cursor:"pointer",background:"#1A1A1A",textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:4}}>🧹</div>
            <div style={{fontSize:11,fontWeight:700,color:"#FFF",marginBottom:2}}>New Cleaner?</div>
            <div style={{fontSize:9,color:"#888"}}>Apply to join a team</div>
          </button>
          <button onClick={()=>{setMode("manager_signup");setErr("");}} style={{flex:1,padding:"12px 8px",borderRadius:10,border:"1px solid rgba(204,0,0,.3)",cursor:"pointer",background:"rgba(204,0,0,.06)",textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:4}}>🏠</div>
            <div style={{fontSize:11,fontWeight:700,color:"#CC0000",marginBottom:2}}>Manager / Host?</div>
            <div style={{fontSize:9,color:"#888"}}>Create your account</div>
          </button>
        </div>}

        {(mode==="signup"||mode==="manager_signup")&&<button onClick={()=>{setMode("login");setErr("");}} style={{background:"none",border:"none",color:"#888",fontSize:12,cursor:"pointer",marginBottom:16,display:"flex",alignItems:"center",gap:4}}>← Back to Sign In</button>}

        {/* Login form */}
        {mode==="login"&&<div style={{fontSize:12,color:"#666",textAlign:"center",marginBottom:16,lineHeight:1.7}}>
          Already part of the team? Sign in with your email and password.
        </div>}
        {mode==="login"&&<div style={{background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:16,padding:28,marginBottom:14}}>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Email Address</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" type="email" autoComplete="email" style={{marginTop:6}}/>
          </div>
          <div style={{marginBottom:4}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Password</label>
            <div style={{position:"relative",marginTop:6}}>
              <input value={pwd} onChange={function(e){setPwd(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")go();}} placeholder="Your password"
                type={showPwd?"text":"password"}
                style={{width:"100%",boxSizing:"border-box",paddingRight:40}}/>
              <button onClick={function(){setShowPwd(!showPwd);}} type="button"
                style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:16,padding:0,lineHeight:1}}>
                {showPwd?"🙈":"👁"}
              </button>
            </div>
          </div>
          <div style={{textAlign:"right",marginBottom:16}}>
            <button onClick={()=>setShowForgot(true)} style={{background:"none",border:"none",color:"#CC0000",fontSize:11,cursor:"pointer",fontFamily:"Inter,sans-serif",padding:"4px 0"}}>Forgot Password?</button>
          </div>
          {err&&<div style={{color:"#EF4444",fontSize:12,marginBottom:12,textAlign:"center"}}>{err}</div>}
          <button className="btn" style={{width:"100%",padding:13,fontSize:14,background:loading?"#555":err?"rgba(204,0,0,.35)":undefined}} disabled={loading} onClick={function(){if(!tosOk){setShowTos(true);}else{doLogin();}}}>
              {loading?"SIGNING IN...":"SIGN IN"}
            </button>

          {/* Fingerprint / Face ID button */}
          {localStorage.getItem("turnready_bio_email")&&(
            <button onClick={function(){setBioError("");handleBiometric();}}
              style={{width:"100%",marginTop:10,padding:12,background:"transparent",border:"1px solid #333",borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,color:C.offWhite,fontSize:13,fontFamily:"Inter,sans-serif"}}>
              <span style={{fontSize:22}}>🔒</span>
              <span style={{fontWeight:600}}>Sign in with Fingerprint / Face ID</span>
            </button>
          )}
          {bioError&&<div style={{color:"#EF4444",fontSize:11,textAlign:"center",marginTop:8,lineHeight:1.5}}>{bioError}</div>}

          <div style={{textAlign:"center",marginTop:12,marginBottom:4}}>
            <button onClick={function(){setShowTosRead(true);}} style={{background:"none",border:"none",color:"#555",fontSize:11,cursor:"pointer",textDecoration:"underline"}}>Terms of Service & Privacy Policy</button>
          </div>
          <div style={{height:1,background:"#2A2A2A",margin:"18px 0"}}/>
          <div style={{background:"#141414",borderRadius:8,padding:12,border:"1px solid #222"}}>
            <div style={{fontSize:10,color:"#555",marginBottom:6,textTransform:"uppercase",letterSpacing:.8,fontWeight:600}}>Demo Accounts</div>
            <div style={{fontSize:11,color:"#555",lineHeight:2}}>
              <div><span style={{color:"#CC0000",fontWeight:600}}>Manager:</span> manager@turnready.app / admin123</div>
              <div><span style={{color:"#888"}}>Cleaner:</span> maria@turnready.app / clean123</div>
            </div>
          </div>
        </div>}

        {/* Cleaner signup */}
        {mode==="signup"&&<div style={{background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:16,padding:28,marginBottom:14}}>
          <div style={{background:"rgba(204,0,0,.08)",border:"1px solid rgba(204,0,0,.2)",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:12,color:"#AAA",lineHeight:1.6}}>
            <span style={{color:"#CC0000",fontWeight:700}}>Cleaners only. </span>
            This form is for cleaning team members. If you are a manager, use the Manager / Host option.
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Full Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="First and last name" style={{marginTop:6}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" type="email" style={{marginTop:6}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Phone</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(555) 000-0000" type="tel" style={{marginTop:6}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Create Password</label>
            <input value={pwd} onChange={function(e){setPwd(e.target.value);}} placeholder="At least 8 characters" type="password" style={{marginTop:6}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Confirm Password</label>
            <input value={pwd2} onChange={function(e){setPwd2(e.target.value);}} placeholder="Re-enter password" type="password" style={{marginTop:6}}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Invite Code <span style={{color:"#555",fontWeight:400,textTransform:"none"}}>(optional)</span></label>
            <input value={inviteInput} onChange={function(e){setInviteInput(e.target.value.toUpperCase());setErr("");}} placeholder="e.g. HARVEY2024" style={{marginTop:6,letterSpacing:2,fontWeight:700}}/>
          </div>
          {err&&<div style={{color:"#EF4444",fontSize:12,marginBottom:12}}>{err}</div>}
          <button className="btn" style={{width:"100%",padding:13}} onClick={async function(){
            if(!name||!email||!phone||!pwd){setErr("Please fill in all fields.");return;}
            if(pwd.length<8){setErr("Password must be at least 8 characters.");return;}
            if(pwd!==pwd2){setErr("Passwords do not match.");return;}
            var codeOk=inviteInput.trim().toUpperCase()===inviteCode;
            setLoading(true);setErr("");
            try{
              if(codeOk||inviteInput.trim()===""){
                await signUp({email:email.trim().toLowerCase(),password:pwd,name:name.trim(),role:"cleaner",inviteCode:codeOk?inviteInput.trim().toUpperCase():null,phone:phone.trim()});
                if(codeOk){
                  await signIn({email:email.trim().toLowerCase(),password:pwd});
                  var profile=await getCurrentUser();
                  setLoading(false);
                  var mp=profile?Object.assign({},profile,{
                    stripeStatus:profile.stripe_status||"pending",
                    stripeAccount:profile.stripe_account_id||null,
                    totalEarned:profile.total_earned||0,
                    jobsCompleted:profile.jobs_completed||0,
                    joinedAt:profile.joined_at||new Date().toISOString(),
                    photo:profile.photo||null,
                    avatar:profile.avatar||null,
                    businessPhone:profile.business_phone||null,
                    businessAddress:profile.business_address||null,
                    emergency:profile.emergency||null,
                  }):profile;
                  onLogin(mp,true,mp);
                } else {
                  setLoading(false);setSignupDone(true);
                }
              } else {
                setLoading(false);setErr("Invalid invite code. Ask your manager for the correct code.");
              }
            }catch(e){
              setLoading(false);
              if(codeOk){
                var av=name.trim().split(" ").map(function(w){return w[0]||"";}).join("").slice(0,2).toUpperCase();
                var nc={id:"c"+Date.now(),name:name.trim(),email:email.trim().toLowerCase(),phone:phone.trim(),password:pwd,totalEarned:0,jobsCompleted:0,rating:5.0,avatar:av,role:"backup",reviews:[],joinedAt:new Date().toISOString()};
                setCleaners(function(cs){return cs.concat([nc]);});
                onLogin(Object.assign({},nc,{role:"cleaner"}),true,nc);
              } else { setErr(e.message||"Sign up failed. Please try again."); }
            }
          }}>{loading?"PLEASE WAIT...":inviteInput.trim()?"JOIN NOW":"Apply to Join"}</button>
          <div style={{fontSize:11,color:"#555",textAlign:"center",marginTop:10}}>
            {inviteInput.trim()?"Valid code: you will be signed in immediately.":"No invite code? Your application will be reviewed by the manager."}
          </div>
        </div>}

        {/* Manager signup */}
        {mode==="manager_signup"&&<div style={{background:"#1A1A1A",border:"1px solid rgba(204,0,0,.3)",borderRadius:16,padding:28,marginBottom:14}}>
          <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:18,letterSpacing:1,color:"#CC0000",marginBottom:4}}>START YOUR BUSINESS</div>
          <div style={{fontSize:12,color:"#888",marginBottom:16,lineHeight:1.6}}>Create your manager account. 7-day free trial — no charge until day 8.</div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Business Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Harvey's Professional Cleaning" style={{marginTop:6}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Your Full Name</label>
            <input value={name2} onChange={e=>setName2(e.target.value)} placeholder="First and last name" style={{marginTop:6}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Email Address</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@yourbusiness.com" type="email" style={{marginTop:6}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Phone Number</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(555) 000-0000" type="tel" style={{marginTop:6}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Create Password</label>
            <input value={pwd2} onChange={function(e){setPwd2(e.target.value);}} placeholder="At least 8 characters" type="password" style={{marginTop:6}}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Confirm Password</label>
            <input value={pwd} onChange={function(e){setPwd(e.target.value);}} placeholder="Re-enter your password" type="password" style={{marginTop:6}}/>
          </div>
          {err&&<div style={{color:"#EF4444",fontSize:12,marginBottom:12}}>{err}</div>}
          <button className="btn" style={{width:"100%",padding:14,fontSize:13,marginBottom:10}} onClick={async function(){
            if(!name||!name2||!email||!pwd2){setErr("Please fill in all required fields.");return;}
            if(pwd2.length<8){setErr("Password must be at least 8 characters.");return;}
            if(pwd2!==pwd){setErr("Passwords do not match.");return;}
            setLoading(true);setErr("");
            try{
              await signUp({email:email.trim().toLowerCase(),password:pwd2,name:name2.trim(),role:"manager",phone:phone.trim()});
              await signIn({email:email.trim().toLowerCase(),password:pwd2});
              var profile=await getCurrentUser();
              if(profile){
                profile.business_name=name.trim();
                profile.businessName=name.trim();
                profile.stripeBusinessStatus="not_connected";
              }
              setLoading(false);
              onLogin(profile||{id:"mgr"+Date.now(),name:name2,businessName:name,email:email.trim().toLowerCase(),role:"manager",plan:"trial",avatar:name2.split(" ").map(function(w){return w[0]||"";}).join("").slice(0,2).toUpperCase(),stripeBusinessStatus:"not_connected"},true);
            }catch(e){
              setLoading(false);
              var newMgr={id:"mgr"+Date.now(),name:name2,businessName:name,email:email.trim().toLowerCase(),phone:phone.trim(),password:pwd2,role:"manager",plan:"trial",trialStart:new Date().toISOString(),avatar:name2.split(" ").map(function(w){return w[0]||"";}).join("").slice(0,2).toUpperCase(),stripeBusinessStatus:"not_connected"};
              onLogin(newMgr,true);
            }
          }}>{loading?"CREATING ACCOUNT...":"Start 7-Day Free Trial →"}</button>
          <div style={{fontSize:10,color:"#555",textAlign:"center"}}>Credit card required after trial. Cancel anytime.</div>
        </div>}

      </div>

      {showTos&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:500,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#141414",borderRadius:"16px 16px 0 0",padding:24,width:"100%",borderTop:"1px solid #2A2A2A"}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,letterSpacing:.5,marginBottom:8,textAlign:"center"}}>Before You Continue</div>
            <div style={{fontSize:12,color:"#888",textAlign:"center",lineHeight:1.6,marginBottom:20}}>
              By using TurnReady you agree to our{" "}
              <button onClick={function(){setShowTos(false);setShowTosRead(true);}} style={{background:"none",border:"none",color:"#CC0000",fontSize:12,cursor:"pointer",fontWeight:700,padding:0,textDecoration:"underline"}}>Terms of Service and Privacy Policy</button>
            </div>
            <button onClick={agreeToTos} style={{width:"100%",background:"#CC0000",border:"none",borderRadius:10,padding:"14px",color:"#FFF",fontSize:13,fontWeight:900,fontFamily:"Arial Black,sans-serif",letterSpacing:.5,cursor:"pointer",marginBottom:10}}>I AGREE — CONTINUE</button>
            <button onClick={function(){setShowTos(false);}} style={{width:"100%",background:"transparent",border:"none",color:"#555",fontSize:12,cursor:"pointer",padding:"8px"}}>Cancel</button>
          </div>
        </div>
      )}

      {showTosRead&&(
        <div style={{position:"fixed",inset:0,background:"#0D0D0D",zIndex:600,display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",borderBottom:"1px solid #2A2A2A",flexShrink:0}}>
            <button onClick={function(){setShowTosRead(false);}} style={{background:"none",border:"none",color:"#CC0000",fontSize:20,cursor:"pointer"}}>{"<"}</button>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,letterSpacing:.5}}>TERMS AND PRIVACY</div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"20px",WebkitOverflowScrolling:"touch"}}>
            <div style={{background:"#141414",borderRadius:12,padding:20,marginBottom:16,border:"1px solid #2A2A2A"}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,letterSpacing:1,marginBottom:14,color:"#CC0000"}}>TERMS OF SERVICE</div>
              <div style={{fontSize:12,color:"#CCC",lineHeight:1.8}}>
                <p style={{marginBottom:10,fontWeight:700,color:"#FFF"}}>1. Acceptance of Terms</p><p style={{marginBottom:10}}>By accessing or using TurnReady, you agree to be bound by these Terms. If you do not agree, do not use this App.</p>
                <p style={{marginBottom:10,fontWeight:700,color:"#FFF"}}>2. Use of the App</p><p style={{marginBottom:10}}>The App is for authorized users of Harvey's Professional Cleaning LLC only. You agree to use it only for lawful purposes and in accordance with company policies.</p>
                <p style={{marginBottom:10,fontWeight:700,color:"#FFF"}}>3. User Responsibilities</p><p style={{marginBottom:10}}>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.</p>
                <p style={{marginBottom:10,fontWeight:700,color:"#FFF"}}>4. Documentation and Media</p><p style={{marginBottom:10}}>Photos and videos submitted through the App are property records. You grant the company a license to use submitted media for quality assurance.</p>
                <p style={{marginBottom:10,fontWeight:700,color:"#FFF"}}>5. Independent Contractor Status</p><p style={{marginBottom:10}}>Cleaners are independent contractors, not employees. You are responsible for your own taxes, insurance, and legal compliance.</p>
                <p style={{marginBottom:10,fontWeight:700,color:"#FFF"}}>6. Limitation of Liability</p><p style={{marginBottom:10}}>Harvey's Professional Cleaning LLC is not liable for any indirect or consequential damages. The App is provided as is.</p>
                <p style={{marginBottom:10,fontWeight:700,color:"#FFF"}}>7. Termination</p><p style={{marginBottom:10}}>We reserve the right to terminate access at any time for violation of these Terms or company policies.</p>
                <p style={{marginBottom:10,fontWeight:700,color:"#FFF"}}>8. Governing Law</p><p style={{marginBottom:0}}>These Terms are governed by the laws of the State of Georgia.</p>
              </div>
            </div>
            <div style={{background:"#141414",borderRadius:12,padding:20,marginBottom:24,border:"1px solid #2A2A2A"}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,letterSpacing:1,marginBottom:14,color:"#CC0000"}}>PRIVACY POLICY</div>
              <div style={{fontSize:12,color:"#CCC",lineHeight:1.8}}>
                <p style={{marginBottom:10,fontWeight:700,color:"#FFF"}}>What We Collect</p><p style={{marginBottom:10}}>Name, email, phone, payment info, job photos and videos, and app usage data.</p>
                <p style={{marginBottom:10,fontWeight:700,color:"#FFF"}}>How We Use It</p><p style={{marginBottom:10}}>To manage job assignments, verify cleaning quality, process payments, and communicate with team members.</p>
                <p style={{marginBottom:10,fontWeight:700,color:"#FFF"}}>Data Security</p><p style={{marginBottom:10}}>All data is encrypted. Access is limited to authorized personnel. Your information is never sold to third parties.</p>
                <p style={{marginBottom:0,fontWeight:700,color:"#FFF"}}>Your Rights</p><p>You may request access to or deletion of your data by contacting management.</p>
              </div>
            </div>
          </div>
          <div style={{padding:"16px 20px",borderTop:"1px solid #2A2A2A",flexShrink:0}}>
            <button onClick={function(){agreeToTos();setShowTosRead(false);}} style={{width:"100%",background:"#CC0000",border:"none",borderRadius:10,padding:"14px",color:"#FFF",fontSize:13,fontWeight:900,fontFamily:"Arial Black,sans-serif",letterSpacing:.5,cursor:"pointer"}}>I AGREE — CONTINUE</button>
          </div>
        </div>
      )}
    </div>
  );
}


function TopBar({view,setView,user,notifs,notifications,onLogout,openAI,onBell,darkMode,setDarkMode}){
  var mgrNav=["Dashboard","Properties","Approvals","Messages"];
  var clnNav=["Home","My Jobs","Messages"];
  var bottomNav=user.role==="manager"?mgrNav:clnNav;
  var mgrMenu=["Dashboard","Properties","Approvals","Messages","Team","Calendar","Payroll","Reports","Leaderboard","My Profile","Help & Support"];
  var clnMenu=["Home","My Jobs","My Earnings","My Ratings","Messages","Calendar","My Profile","The Harvey System","Help & Support"];
  var menuItems=user.role==="manager"?mgrMenu:clnMenu;
  const [menuOpen,setMenuOpen]=useState(false);
  var homeView=user.role==="manager"?"Dashboard":"Home";
  var isHomeView=view===homeView;

  return(
    <div>
      {/* Top bar */}
      <div style={{background:"#141414",borderBottom:"1px solid #2A2A2A",padding:"0 12px",display:"flex",alignItems:"center",height:52,position:"fixed",top:0,left:0,right:0,zIndex:200}}>
        {!isHomeView?(
          <button onClick={()=>setView(homeView)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px 8px 4px 0",flexShrink:0,display:"flex",alignItems:"center",gap:4,color:"#CC0000"}}>
            <span style={{fontSize:20,fontWeight:700,lineHeight:1}}>{"<"}</span>
          </button>
        ):(
          <button onClick={()=>setMenuOpen(!menuOpen)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px 8px 4px 0",flexShrink:0,display:"flex",flexDirection:"column",gap:5,justifyContent:"center"}}>
            <span style={{display:"block",width:22,height:2,background:"#FFF",borderRadius:2}}/>
            <span style={{display:"block",width:22,height:2,background:"#CC0000",borderRadius:2}}/>
            <span style={{display:"block",width:22,height:2,background:"#FFF",borderRadius:2}}/>
          </button>
        )}
        <div style={{flex:1,textAlign:"center"}}>
          <span style={{fontFamily:"Arial Black,Impact,sans-serif",fontSize:14,fontWeight:900,color:"#FFF"}}>TURN</span>
          <span style={{fontFamily:"Arial Black,Impact,sans-serif",fontSize:14,fontWeight:900,color:"#CC0000"}}>READY</span>
        </div>
        <button onClick={onBell} style={{background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:8,color:"#FFF",fontSize:11,cursor:"pointer",padding:"4px 7px",marginRight:4,flexShrink:0,position:"relative"}}>
          🔔{(function(){var unread=(notifications||[]).filter(function(n){return !n.read;}).length;return unread>0?<span style={{position:"absolute",top:-4,right:-4,minWidth:16,height:16,background:"#CC0000",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#FFF",padding:"0 3px"}}>{unread>9?"9+":unread}</span>:null;})()}
        </button>
        <button onClick={openAI} style={{background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:8,color:"#FFF",fontSize:11,fontWeight:700,cursor:"pointer",padding:"5px 8px",marginRight:4,flexShrink:0}}>AI</button>
        <div className="avatar" style={{width:32,height:32,fontSize:12,flexShrink:0}}>{initials(user.name)}</div>
      </div>

      {/* Hamburger menu overlay */}
      {menuOpen&&<div style={{position:"fixed",inset:0,zIndex:200}} onClick={()=>setMenuOpen(false)}>
        <div style={{position:"absolute",top:0,left:0,width:240,height:"100vh",background:"#141414",borderRight:"1px solid #2A2A2A",overflowY:"scroll",WebkitOverflowScrolling:"touch",padding:16,paddingBottom:80,boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:10,color:"#555",letterSpacing:1,marginBottom:12,fontWeight:600}}>MENU</div>
          {menuItems.map(i=>{
            var hasNotif=(i==="Approvals"&&notifs>0)||(i==="Messages"&&(notifications||[]).filter(n=>!n.read&&n.type==="message").length>0);
            return(
              <button key={i} onClick={()=>{setView(i);setMenuOpen(false);}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",textAlign:"left",background:view===i?"rgba(204,0,0,.15)":"none",border:"none",borderRadius:8,color:view===i?"#CC0000":"#E8E8E8",padding:"13px 14px",cursor:"pointer",fontSize:15,fontWeight:900,marginBottom:4,fontFamily:"Arial Black,sans-serif",letterSpacing:1}}>
                <span>{i}</span>
                {hasNotif&&<span style={{width:8,height:8,background:"#CC0000",borderRadius:"50%",display:"inline-block",flexShrink:0}}/>}
              </button>
            );
          })}
          <div style={{borderTop:"1px solid #2A2A2A",marginTop:16,paddingTop:16}}>
            <div style={{fontSize:11,color:"#888",marginBottom:8}}>{user.name}</div>
            <button onClick={()=>{onLogout();setMenuOpen(false);}} style={{background:"none",border:"1px solid #333",borderRadius:6,color:"#888",padding:"6px 12px",cursor:"pointer",fontSize:11,width:"100%"}}>Sign Out</button>
            <button onClick={function(){setDarkMode&&setDarkMode(!darkMode);}}
              style={{background:"transparent",border:"1px solid #333",borderRadius:8,padding:"10px 14px",color:C.offWhite,textAlign:"left",cursor:"pointer",fontSize:11,width:"100%",marginTop:6,display:"flex",alignItems:"center",gap:8}}>
              <span>{darkMode?"☀️":"🌙"}</span>
              <span>{darkMode?"Light Mode":"Dark Mode"}</span>
            </button>
          </div>
        </div>
      </div>}

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,height:56,background:"#141414",borderTop:"1px solid #2A2A2A",display:"flex",alignItems:"center",zIndex:100,paddingBottom:2}}>
        {bottomNav.map(i=>(
          <button key={i} onClick={()=>setView(i)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 2px",color:view===i?"#CC0000":"#555",fontFamily:"Inter,sans-serif",position:"relative"}}>
            <div style={{fontSize:18}}>{i==="Dashboard"?"🏠":i==="Properties"?"🏘️":i==="Approvals"?"✅":i==="Messages"?"💬":i==="Home"?"🏠":i==="My Jobs"?"🧹":i==="My Earnings"?"💰":"📱"}</div>
            <div style={{fontSize:9,fontWeight:view===i?700:400,letterSpacing:0,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:64}}>
              {i}
              {i==="Approvals"&&notifs>0&&<span style={{position:"absolute",top:2,right:"50%",marginRight:-16,width:7,height:7,background:"#CC0000",borderRadius:"50%",display:"block"}}/>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function Stat({label,value,color,sub}){
  return(
    <div className="stat-card">
      <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>{label}</div>
      <div style={{fontSize:22,fontWeight:700,fontFamily:"Arial Black,sans-serif",fontWeight:900,letterSpacing:1,color:color||C.white}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:C.muted,marginTop:3}}>{sub}</div>}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({props,cleaners,jobs,setView,notifications,onSelectCleaner}){
  var pend=jobs.filter(j=>j.status==="pending_approval").length;
  var approved=jobs.filter(j=>j.status==="approved");
  var paid=approved.reduce((s,j)=>s+j.pay,0);
  var assigned=props.filter(p=>(p.schedule||[]).length>0).length;
  // Supply reorder alerts - items low across multiple properties
  var supplyAlerts=[];
  var itemMap={};
  (props||[]).forEach(function(p){
    (p.inventory||[]).forEach(function(inv){
      var isLow=inv.cleanerStatus==="low"||(inv.cleanerStatus==="med")?(inv.inStock<inv.required*0.5):(inv.inStock<inv.required*0.3);
      var isEmpty=inv.cleanerStatus==="low"||(inv.inStock===0);
      if(isEmpty||isLow){
        if(!itemMap[inv.item])itemMap[inv.item]={item:inv.item,props:[],count:0,critical:false};
        itemMap[inv.item].props.push(p.name);
        itemMap[inv.item].count++;
        if(isEmpty)itemMap[inv.item].critical=true;
      }
    });
  });
  Object.keys(itemMap).forEach(function(k){
    if(itemMap[k].count>=2)supplyAlerts.push(itemMap[k]);
  });
  supplyAlerts.sort(function(a,b){return (b.critical?1:0)-(a.critical?1:0)||b.count-a.count;});

  // Pending acceptance slots - jobs sent to cleaners awaiting response
  var pendingAcceptance=[];
  props.forEach(function(p){
    (p.schedule||[]).forEach(function(slot){
      if(slot.status==="pending_acceptance"&&slot.cleanerId){
        var cl=cleaners.find(function(c){return c.id===slot.cleanerId;})||{name:"Unknown"};
        var hoursLeft=slot.assignedAt?Math.max(0,8-((Date.now()-new Date(slot.assignedAt).getTime())/3600000)):8;
        pendingAcceptance.push({prop:p,slot:slot,cleaner:cl,hoursLeft:hoursLeft});
      }
    });
  });
  pendingAcceptance.sort(function(a,b){return a.hoursLeft-b.hoursLeft;});
  var today=new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  var upcoming=[];
  props.forEach(p=>(p.schedule||[]).forEach(slot=>{
    if(slot.status!=="complete"){
      var cl=cleaners.find(c=>c.id===slot.cleanerId);
      upcoming.push({prop:p,slot,cl});
    }
  }));
  upcoming.sort((a,b)=>new Date(a.slot.date)-new Date(b.slot.date));

  return(
    <div>
      <div style={{marginBottom:14}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1}}>DASHBOARD</div>
        <div style={{color:C.muted,fontSize:11,marginTop:2}}>{today}</div>
      </div>

      {/* Stat cards - 3 column grid, compact */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:14}}>
        <div onClick={()=>setView("Properties")} style={{background:C.card,border:"1px solid "+(C.border),borderRadius:10,padding:"10px 6px",cursor:"pointer",textAlign:"center",overflow:"hidden"}}>
          <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>PROPERTIES</div>
          <div style={{fontSize:24,fontWeight:700,lineHeight:1}}>{props.length}</div>
          <div style={{fontSize:8,color:C.muted,marginTop:3}}>{assigned} assigned</div>
          <div style={{fontSize:8,color:C.red,marginTop:5,fontWeight:700}}>Tap to manage</div>
        </div>
        <div onClick={()=>setView("Approvals")} style={{background:C.card,border:"1px solid "+(pend>0?"rgba(245,158,11,.4)":C.border),borderRadius:10,padding:"10px 6px",cursor:"pointer",textAlign:"center",overflow:"hidden"}}>
          <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>PENDING</div>
          <div style={{fontSize:24,fontWeight:700,lineHeight:1,color:pend>0?"#F59E0B":C.white}}>{pend}</div>
          <div style={{fontSize:8,color:C.muted,marginTop:3}}>await approval</div>
          <div style={{fontSize:8,color:pend>0?"#F59E0B":C.muted,marginTop:5,fontWeight:700}}>{pend>0?"Tap to review":"All clear"}</div>
        </div>
        <div onClick={()=>setView("Payroll")} style={{background:C.card,border:"1px solid "+(C.border),borderRadius:10,padding:"10px 6px",cursor:"pointer",textAlign:"center",overflow:"hidden"}}>
          <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>PAID OUT</div>
          <div style={{fontSize:15,fontWeight:700,lineHeight:1,color:C.red}}>${paid.toFixed(2)}</div>
          <div style={{fontSize:8,color:C.muted,marginTop:3}}>via Stripe</div>
          <div style={{fontSize:8,color:C.red,marginTop:5,fontWeight:700}}>Tap for payroll</div>
        </div>
      </div>

      {/* Upcoming assignments */}
      {upcoming.length>0&&(
        <div className="card" style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:600,fontSize:13}}>Upcoming Assignments</div>
            <button onClick={()=>setView("Properties")} style={{background:"none",border:"none",color:C.red,fontSize:11,cursor:"pointer",fontWeight:600}}>View all &gt;</button>
          </div>
          {upcoming.slice(0,3).map(({prop,slot,cl})=>(
            <div key={slot.id||slot.date} onClick={()=>setView("Properties")} style={{borderBottom:"1px solid #222",paddingBottom:8,marginBottom:8,cursor:"pointer",borderRadius:6,padding:"8px",margin:"0 -8px 8px -8px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontWeight:600,fontSize:12}}>{prop.name}</div>
                <span style={{background:"rgba(34,197,94,.15)",color:"#22C55E",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,flexShrink:0}}>${prop.pay}.00</span>
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>{cl?cl.name:"Unassigned"} · {slot.date} {slot.time||"11:00"}</div>
              <div style={{fontSize:9,color:C.red,marginTop:4,fontWeight:600}}>Tap to view →</div>
            </div>
          ))}
        </div>
      )}

      {/* Pending approval banner */}
      {pend>0&&(
        <div className="card" style={{border:"1px solid rgba(245,158,11,.4)",cursor:"pointer",marginBottom:12}} onClick={()=>setView("Approvals")}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#F59E0B",marginBottom:3}}>{pend} job{pend!==1?"s":""} awaiting your approval</div>
              <div style={{fontSize:11,color:C.muted}}>Tap to review and pay your cleaners</div>
            </div>
            <div style={{fontSize:18,color:"#F59E0B"}}>›</div>
          </div>
        </div>
      )}

      {/* Jobs In Progress */}
      {(function(){
        var inProgress=[];
        (props||[]).forEach(function(p){
          (p.schedule||[]).forEach(function(slot){
            if(slot.status==="accepted"||slot.status==="in_progress"){
              var cl=cleaners.find(function(c){return c.id===slot.cleanerId;})||{name:"Cleaner"};
              inProgress.push({prop:p,slot:slot,cleaner:cl});
            }
          });
        });
        // Also check jobs with pending_approval (just submitted = was in progress)
        var recentlySubmitted=(jobs||[]).filter(function(j){
          return j.status==="pending_approval"&&j.completedAt&&(Date.now()-new Date(j.completedAt).getTime())<3600000;
        });
        if(inProgress.length===0&&recentlySubmitted.length===0)return null;
        return(
          <div style={{background:"rgba(34,197,94,.06)",border:"1.5px solid rgba(34,197,94,.25)",borderRadius:12,padding:14,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,color:"#22C55E"}}>🧹 JOBS IN PROGRESS</div>
              {inProgress.length>0&&<span style={{background:"rgba(34,197,94,.2)",color:"#22C55E",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10}}>{inProgress.length} active</span>}
            </div>
            {inProgress.map(function(item){
              return(
                <div key={item.slot.id} onClick={function(){setView("Properties");}}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid rgba(34,197,94,.1)",cursor:"pointer"}}>
                  <div style={{width:36,height:36,borderRadius:8,overflow:"hidden",flexShrink:0,background:"#1A1A1A",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {item.prop.photo?<img src={item.prop.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:16,opacity:.4}}>🏠</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:2}}>{item.prop.name}</div>
                    <div style={{fontSize:11,color:"#888"}}>{item.cleaner.name} · started {item.slot.time||"11:00"}</div>
                  </div>
                  <div style={{flexShrink:0}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"#22C55E",animation:"pulse 1.5s infinite"}}/>
                  </div>
                </div>
              );
            })}
            {recentlySubmitted.map(function(j){
              return(
                <div key={j.id} onClick={function(){setView("Approvals");}}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",cursor:"pointer"}}>
                  <div style={{width:36,height:36,borderRadius:8,background:"rgba(245,158,11,.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:18}}>✅</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:2}}>{j.propertyName}</div>
                    <div style={{fontSize:11,color:"#888"}}>Just submitted · awaiting your approval</div>
                  </div>
                  <div style={{fontSize:10,color:"#F59E0B",fontWeight:700,flexShrink:0}}>Review →</div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Emergency Alerts */}
      {(function(){
        var emergencies=(notifications||[]).filter(function(n){return n.type==="emergency"&&!n.read;});
        if(!emergencies.length)return null;
        return(
          <div style={{background:"rgba(239,68,68,.08)",border:"1.5px solid rgba(239,68,68,.4)",borderRadius:12,padding:14,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,color:"#EF4444"}}>🚨 EMERGENCY ALERTS</div>
              <span style={{background:"#EF4444",color:"#FFF",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10}}>{emergencies.length}</span>
            </div>
            {emergencies.map(function(n){return(
              <div key={n.id} onClick={function(){setView("Properties");}} style={{background:"rgba(239,68,68,.06)",borderRadius:8,padding:"10px 12px",marginBottom:6,cursor:"pointer",border:"1px solid rgba(239,68,68,.2)"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#EF4444",marginBottom:3}}>{n.title}</div>
                <div style={{fontSize:11,color:"#888",lineHeight:1.5}}>{n.body}</div>
                <div style={{fontSize:10,color:"#EF4444",fontWeight:700,marginTop:6}}>Tap to view property →</div>
              </div>
            );})}
          </div>
        );
      })()}

      {/* Pending Acceptance */}
      {pendingAcceptance.length>0&&(
        <div className="card" style={{marginBottom:12,border:"1px solid rgba(245,158,11,.3)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,color:"#F59E0B"}}>⏳ AWAITING RESPONSE</div>
            <span style={{background:"rgba(245,158,11,.15)",color:"#F59E0B",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10}}>{pendingAcceptance.length}</span>
          </div>
          {pendingAcceptance.map(function(item){
            var urgent=item.hoursLeft<2;
            return(
              <div key={item.slot.id} onClick={function(){setView("Approvals");}}
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #222",cursor:"pointer"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{item.prop.name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{item.cleaner.name} · {item.slot.date} at {item.slot.time||"11:00"}</div>
                  <div style={{fontSize:9,color:C.red,fontWeight:700,marginTop:2}}>Tap to manage →</div>
                </div>
                <div style={{flexShrink:0,textAlign:"right"}}>
                  <div style={{fontSize:11,fontWeight:700,color:urgent?"#EF4444":"#F59E0B"}}>
                    {urgent?"🚨":"⏳"} {item.hoursLeft.toFixed(1)}h left
                  </div>
                  <div style={{fontSize:9,color:C.muted,marginTop:2}}>{urgent?"Expires soon!":"Waiting..."}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Supply Reorder Alerts */}
      {supplyAlerts.length>0&&(
        <div style={{background:"rgba(245,158,11,.07)",border:"1.5px solid rgba(245,158,11,.3)",borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,color:"#F59E0B"}}>📦 SUPPLY REORDER NEEDED</div>
            <span style={{background:"rgba(245,158,11,.2)",color:"#F59E0B",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10}}>{supplyAlerts.length}</span>
          </div>
          {supplyAlerts.map(function(alert){
            return(
              <div key={alert.item} onClick={function(){setView("Properties");}}
                style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 0",borderBottom:"1px solid rgba(245,158,11,.1)",cursor:"pointer"}}>
                <div style={{fontSize:20,flexShrink:0}}>{alert.critical?"🔴":"🟡"}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{alert.item}</div>
                  <div style={{fontSize:11,color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    Low at: {alert.props.join(", ")}
                  </div>
                </div>
                <div style={{flexShrink:0,textAlign:"right"}}>
                  <div style={{fontSize:11,fontWeight:700,color:alert.critical?"#EF4444":"#F59E0B"}}>{alert.count} prop{alert.count!==1?"s":""}</div>
                  <div style={{fontSize:9,color:"#555",marginTop:2}}>{alert.critical?"REORDER NOW":"Running low"}</div>
                </div>
              </div>
            );
          })}
          <div style={{fontSize:10,color:"#555",marginTop:10,textAlign:"center"}}>Tap any item to go to Properties and check inventory</div>
        </div>
      )}

      {/* Team overview */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontWeight:600,fontSize:13}}>Team Overview</div>
          <button onClick={()=>setView("Team")} style={{background:"none",border:"none",color:C.red,fontSize:11,cursor:"pointer",fontWeight:600}}>View all &gt;</button>
        </div>
        {cleaners.slice(0,3).map(c=>(
          <div key={c.id} onClick={()=>{setView("Team");onSelectCleaner&&onSelectCleaner(c);}} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,cursor:"pointer",padding:"6px 8px",borderRadius:8,margin:"0 -8px 4px -8px"}}>
            <div className="avatar" style={{width:34,height:34,fontSize:12,flexShrink:0}}>{c.avatar}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600}}>{c.name}</div>
              <div style={{fontSize:10,color:C.muted}}>{c.jobsCompleted||0} jobs · ★{(c.rating||5).toFixed(1)}</div>
            </div>
            <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:10,flexShrink:0,
              background:(c.role||"backup")==="primary"?"rgba(34,197,94,.15)":"rgba(245,158,11,.15)",
              color:(c.role||"backup")==="primary"?"#22C55E":"#F59E0B"}}>
              {(c.role||"backup")==="primary"?"PRIMARY":"BACKUP"}
            </span>
            <div style={{fontSize:10,color:C.muted}}>›</div>
          </div>
        ))}
      </div>
    </div>
  );
}


function downloadMedia(url, filename){
  try{
    var a=document.createElement("a");
    a.href=url;
    a.download=filename||"download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }catch(e){
    window.open(url,"_blank");
  }
}

function PropDetail({prop,cleaner,onBack,onAssign,setProps,cleaners=[],addNotification,templates,user}){
  const [activeRoom,setActiveRoom]=useState(null);
  const [activeTab,setActiveTab]=useState("tasks");
  const [editingInvId,setEditingInvId]=useState(null);
  const [editingInvName,setEditingInvName]=useState("");
  const [addingInvItem,setAddingInvItem]=useState(false);
  const [newInvName,setNewInvName]=useState("");
  const [editingInfo,setEditingInfo]=useState(false);
  const [showGallery,setShowGallery]=useState(false);
  const [galleryIdx,setGalleryIdx]=useState(0);
  const [showDeleteConfirm,setShowDeleteConfirm]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const [fullLoaded,setFullLoaded]=useState(false);

  const [showTmplPicker,setShowTmplPicker]=useState(false);
  const [newSecName,setNewSecName]=useState("");
  const [showNewSec,setShowNewSec]=useState(false);
  const [newTaskLabels,setNewTaskLabels]=useState({});
  const [dragTaskId,setDragTaskId]=useState(null);
  const [dragOverTaskId,setDragOverTaskId]=useState(null);
  const [editSecName,setEditSecName]=useState(null);
  const [addingDetail,setAddingDetail]=useState(false);
  const [newDetailKey,setNewDetailKey]=useState("");
  const [newDetailVal,setNewDetailVal]=useState("");
  const [editingRoomId,setEditingRoomId]=useState(null);
  const [addingRoom,setAddingRoom]=useState(false);
  const [newRoomName,setNewRoomName]=useState("");
  const [newRoomIcon,setNewRoomIcon]=useState("🛋️");
  const [note,setNote]=useState(prop.notes||"");
  // Safely access arrays that might be undefined when loading from Supabase
  var safeTasks=prop.tasks||[];
  var safeRooms=prop.rooms||[];
  var safeInventory=prop.inventory||[];
  var safeSchedule=prop.schedule||[];
  var done=safeTasks.filter(t=>t.done).length;
  var total=safeTasks.length;
  var propPct=pct(safeTasks);
  // Build gallery from all property images
  var galleryImages=[];
  if(prop.photo)galleryImages.push({url:prop.photo,label:"Cover Photo"});
  safeRooms.forEach(function(r){
    (r.refPhotos||[]).forEach(function(ph){galleryImages.push({url:ph,label:r.name+" — Reference"});});
    if(r.refVideo)galleryImages.push({url:r.refVideo,label:r.name+" — Reference Video",isVideo:true});
    if(r.preVideo)galleryImages.push({url:r.preVideo,label:r.name+" — Pre-Clean (Arrival)",isVideo:true,isPre:true});
    if(r.video)galleryImages.push({url:r.video,label:r.name+" — After Clean",isAfter:true,isVideo:true});
  });
  (prop.cleanerPhotos||[]).forEach(function(ph){galleryImages.push({url:ph,label:"Cleaner Photo",isCleaner:true});});
  var sections=[...new Set(safeTasks.map(t=>t.section))];

  function saveNote(){setProps(ps=>ps.map(x=>x.id===prop.id?{...x,notes:note}:x));}

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <button className="btn ghost sm" onClick={onBack}>← Back</button>
        <button onClick={function(){setShowDeleteConfirm(true);}}
          style={{background:"transparent",border:"1px solid #EF4444",borderRadius:8,color:"#EF4444",fontSize:11,fontWeight:700,padding:"6px 14px",cursor:"pointer",fontFamily:"Arial Black,sans-serif",letterSpacing:.3}}>
          🗑 DELETE PROPERTY
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm&&(
        <div className="modal-bg" onClick={function(){if(!deleting)setShowDeleteConfirm(false);}}>
          <div className="modal" onClick={function(e){e.stopPropagation();}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,marginBottom:8,color:"#EF4444",letterSpacing:.5}}>DELETE PROPERTY?</div>
            <div style={{fontSize:12,color:"#AAA",marginBottom:6,lineHeight:1.6}}>
              You are about to permanently delete <span style={{color:"#FFF",fontWeight:700}}>{prop.name}</span>.
            </div>
            <div style={{fontSize:11,color:"#888",marginBottom:16,lineHeight:1.6,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"10px 12px"}}>
              ⚠️ This will permanently remove the property, all its tasks, rooms, inventory, and schedule from your account. Any past job history will remain in your reports. This cannot be undone.
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){setShowDeleteConfirm(false);}}
                disabled={deleting}
                style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:8,color:"#888",fontSize:12,fontWeight:700,padding:"10px",cursor:"pointer"}}>
                CANCEL
              </button>
              <button onClick={async function(){
                setDeleting(true);
                try{
                  // Remove from local state immediately
                  setProps(function(ps){return ps.filter(function(p){return p.id!==prop.id;});});
                  // Delete from Supabase if real property (UUID-style id)
                  if(prop.id&&prop.id.includes("-")){
                    await deleteProperty(prop.id);
                  }
                  setDeleting(false);
                  setShowDeleteConfirm(false);
                  onBack();
                }catch(e){
                  console.error("Delete failed:",e.message);
                  setDeleting(false);
                  setShowDeleteConfirm(false);
                  onBack();
                }
              }}
                disabled={deleting}
                style={{flex:2,background:"#EF4444",border:"none",borderRadius:8,color:"#FFF",fontSize:12,fontWeight:900,padding:"10px",cursor:"pointer",fontFamily:"Arial Black,sans-serif",letterSpacing:.3}}>
                {deleting?"DELETING...":"YES, DELETE PROPERTY"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{borderRadius:14,overflow:"hidden",marginBottom:20,position:"relative",height:200}}>
        {prop.photo&&<img src={prop.photo} alt={prop.name} onError={function(e){e.target.style.display="none";}} onClick={function(){setGalleryIdx(0);setShowGallery(true);}} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0,cursor:"pointer"}}/>}
        <div onClick={function(){if(galleryImages.length>0){setGalleryIdx(0);setShowGallery(true);}}} style={{position:"absolute",inset:0,background:"linear-gradient(to top, rgba(0,0,0,.9) 0%, transparent 60%)",cursor:galleryImages.length>0?"pointer":"default"}}/>
        {galleryImages.length>0&&(
          <button onClick={function(){setGalleryIdx(0);setShowGallery(true);}} style={{position:"absolute",bottom:14,right:14,background:"rgba(0,0,0,.55)",border:"1px solid rgba(255,255,255,.15)",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,color:"#FFF",cursor:"pointer"}}>
            🖼 {galleryImages.length} photo{galleryImages.length!==1?"s":""}
          </button>
        )}
        <div style={{position:"absolute",bottom:16,left:16}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontWeight:900,fontSize:26,letterSpacing:1}}>{prop.name}</div>
          <div style={{fontSize:12,color:C.mutedLight}}>{prop.address}</div>
        </div>
        <div style={{position:"absolute",top:12,right:12,display:"flex",gap:6}}>
          <span className="badge green">{fmt(prop.pay)}</span>
          <span className="badge gray">{prop.type}</span>
        </div>
        <div style={{position:"absolute",top:10,left:10,display:"flex",gap:6,alignItems:"center"}}>
          <label style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(0,0,0,.6)",color:"#FFF",padding:"5px 9px",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:700,backdropFilter:"blur(4px)",border:"1px solid rgba(255,255,255,.2)"}}>
            📷
            <input type="file" accept="image/*" style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
              onChange={e=>{
                var file=e.target.files[0];
                if(!file)return;
                var reader=new FileReader();
                reader.onload=function(ev){
                  var isReal=false;try{isReal=localStorage.getItem("turnready_is_real_user")==="true";}catch(ex){}
                  compressImage(ev.target.result,1200,800,0.8,function(compressed){
                    if(isReal&&prop.id&&prop.id.includes("-")){
                      uploadImageToStorage("property-media","properties/"+prop.id+"/cover-"+Date.now()+".jpg",compressed).then(function(url){
                        setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{photo:url});});});
                        updateProperty(prop.id,{photo:url}).catch(function(e){console.error("Cover photo save:",e.message);});
                      }).catch(function(){
                        // Storage failed — keep base64 in state for display only
                        setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{photo:compressed});});});
                      });
                    } else {
                      setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{photo:compressed});});});
                    }
                  });
                };
                reader.readAsDataURL(file);
              }}/>
          </label>
          {prop.photo&&(
            <button onClick={()=>setProps(ps=>ps.map(pp=>pp.id!==prop.id?pp:{...pp,photo:""}))}
              style={{background:"rgba(0,0,0,.6)",border:"1px solid rgba(239,68,68,.6)",color:"#EF4444",padding:"5px 9px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",backdropFilter:"blur(4px)"}}>
              🗑
            </button>
          )}
        </div>
      </div>

      {cleaner&&(
        <div className="card" style={{marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
          <div className="avatar">{cleaner.avatar}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:13}}>{cleaner.name}</div>
            <div style={{fontSize:11,color:C.muted}}>📅 {prop.scheduledDate} at {prop.scheduledTime}</div>
          </div>
          <button className="btn sm" onClick={onAssign}>Reassign</button>
        </div>
      )}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontWeight:600,fontSize:13}}>Job Schedule</div>
          <button className="btn sm" onClick={onAssign}>+ Assign Cleaner</button>
        </div>
        {(!prop.schedule||safeSchedule.length===0)&&<div style={{fontSize:12,color:"#888"}}>No jobs scheduled yet. Tap Assign Cleaner to add one.</div>}
        {safeSchedule.map(slot=>{
          var sc=slot.cleanerId?(cleaners||[]).find(c=>c.id===slot.cleanerId):null;
          var sc2=slot.cleanerId2?(cleaners||[]).find(function(c){return c.id===slot.cleanerId2;}):null;
          var hoursLeft=slot.assignedAt?Math.max(0,8-((Date.now()-new Date(slot.assignedAt).getTime())/3600000)):0;
          var urgent=hoursLeft<2;
          return(
            <div key={slot.id||slot.date} style={{background:"#0D0D0D",borderRadius:8,padding:"10px 12px",marginBottom:6,border:"1px solid "+(slot.status==="pending_acceptance"?(urgent?"rgba(239,68,68,.4)":"rgba(245,158,11,.3)"):"#2A2A2A")}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600}}>{slot.date} at {slot.time||"11:00"}</div>
                  <div style={{fontSize:11,color:"#888",marginTop:2}}>
                  {sc?sc.name:"Unassigned"}
                  {sc2&&<span style={{color:"#3B82F6"}}> + {sc2.name}</span>}
                </div>
                {slot.twoCleaners&&sc2&&(
                  <div style={{fontSize:10,color:"#555",marginTop:3}}>
                    {sc?sc.name.split(" ")[0]:"C1"}: ${(slot.pay1||0).toFixed(0)} · {sc2.name.split(" ")[0]}: ${(slot.pay2||0).toFixed(0)}
                  </div>
                )}
                </div>
                <span style={{fontSize:10,padding:"3px 8px",borderRadius:10,background:slot.status==="approved"?"rgba(34,197,94,.15)":slot.status==="pending_acceptance"?"rgba(245,158,11,.15)":"rgba(100,100,100,.15)",color:slot.status==="approved"?"#22C55E":slot.status==="pending_acceptance"?"#F59E0B":"#888",fontWeight:600}}>
                  {slot.status==="pending_acceptance"?"⏳ "+(hoursLeft.toFixed(1))+"h left":slot.status==="accepted"?"✅ Accepted":slot.status==="declined"?"❌ Declined":slot.status==="approved"?"✓ Approved":slot.status||"Open"}
                </span>
              </div>
            </div>
          );
        })}
      </div>


      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {["tasks","rooms","inventory","rating","notes","info"].map(t=>(
          <button key={t} className={"tab"+(activeTab===t?" on":"")} onClick={()=>setActiveTab(t)} style={{textTransform:"capitalize"}}>{t}</button>
        ))}
      </div>

      {activeTab==="tasks"&&(
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:13}}>Task Checklist</div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <div style={{fontSize:12,color:C.muted}}>{done}/{total} done · {propPct}%</div>
              {templates&&templates.length>0&&(
                <button onClick={function(){setShowTmplPicker(!showTmplPicker);}}
                  style={{background:showTmplPicker?"rgba(204,0,0,.15)":"transparent",border:"1px solid "+(showTmplPicker?"#CC0000":"#444"),borderRadius:6,color:showTmplPicker?"#CC0000":"#888",fontSize:9,fontWeight:700,padding:"3px 7px",cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>
                  📋 TEMPLATE
                </button>
              )}
            </div>
          </div>
          {showTmplPicker&&templates&&(
            <div style={{background:"#0D0D0D",borderRadius:10,padding:12,marginBottom:14,border:"1px solid rgba(204,0,0,.2)"}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,color:"#CC0000",letterSpacing:.5,marginBottom:10}}>APPLY A TEMPLATE</div>
              <div style={{fontSize:11,color:"#888",marginBottom:10,lineHeight:1.5}}>Replaces current tasks with the selected template. This cannot be undone.</div>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
                {templates.map(function(tmpl){return(
                  <button key={tmpl.id} onClick={function(){
                    var newTasks=tmpl.tasks.map(function(t,i){return {id:"t"+(Date.now()+i),section:t.section,label:t.label,done:false};});
                    setProps(function(ps){return ps.map(function(pp){return pp.id!==prop.id?pp:Object.assign({},pp,{tasks:newTasks});});});
                    setShowTmplPicker(false);
                  }} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"1px solid #2A2A2A",background:"#141414",cursor:"pointer",textAlign:"left",width:"100%",boxSizing:"border-box",overflow:"hidden"}}>
                    <span style={{fontSize:20,flexShrink:0}}>{tmpl.icon}</span>
                    <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#FFF",marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tmpl.name}</div>
                      <div style={{fontSize:10,color:"#666",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tmpl.tasks.length} tasks · {[...new Set(tmpl.tasks.map(function(t){return t.section;}))].length} sections</div>
                    </div>
                    <div style={{fontSize:10,color:tmpl.color||"#CC0000",fontWeight:700,flexShrink:0}}>Apply →</div>
                  </button>
                );})}
              </div>
              <button onClick={function(){setShowTmplPicker(false);}} style={{width:"100%",background:"transparent",border:"1px solid #333",borderRadius:6,padding:"7px",color:"#666",fontSize:11,cursor:"pointer"}}>Cancel</button>
            </div>
          )}
          <div className="prog-bar" style={{marginBottom:16}}><div className="prog-fill" style={{width:(propPct)+"%"}}/></div>
          {sections.map(function(sec){return(
            <div key={sec} style={{marginBottom:8}}>
              {editSecName===sec?(
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{color:C.muted,fontSize:12}}>—</span>
                  <input
                    value={editSecName}
                    onChange={function(e){
                      var oldName=sec;
                      var newName=e.target.value;
                      setEditSecName(newName);
                      // Update all tasks in this section live
                      setProps(function(ps){return ps.map(function(pp){
                        if(pp.id!==prop.id)return pp;
                        return Object.assign({},pp,{tasks:(pp.tasks||[]).map(function(tk){
                          return tk.section===oldName?Object.assign({},tk,{section:newName}):tk;
                        })});
                      });});
                    }}
                    onBlur={function(){setEditSecName(null);}}
                    onKeyDown={function(e){if(e.key==="Enter"||e.key==="Escape")setEditSecName(null);}}
                    autoFocus
                    style={{flex:1,fontFamily:"Arial Black,sans-serif",fontWeight:900,fontSize:12,
                      letterSpacing:.5,background:"transparent",border:"none",borderBottom:"1px solid #CC0000",
                      outline:"none",color:C.offWhite,padding:"2px 0"}}/>
                </div>
              ):(
                <div className="section-header" onClick={function(){setEditSecName(sec);}}
                  style={{cursor:"text"}}>— {sec} <span style={{fontSize:9,color:"#444",fontWeight:400}}>✏️</span></div>
              )}
              {safeTasks.filter(function(t){return t.section===sec;}).map(function(t){return(
                <div key={t.id}
                  draggable={true}
                  onDragStart={function(e){setDragTaskId(t.id);e.dataTransfer.effectAllowed="move";}}
                  onDragOver={function(e){e.preventDefault();setDragOverTaskId(t.id);}}
                  onDragLeave={function(){setDragOverTaskId(null);}}
                  onDrop={function(e){
                    e.preventDefault();
                    if(!dragTaskId||dragTaskId===t.id){setDragOverTaskId(null);return;}
                    setProps(function(ps){return ps.map(function(pp){
                      if(pp.id!==prop.id)return pp;
                      var allTasks=pp.tasks.slice();
                      var fromIdx=allTasks.findIndex(function(tk){return tk.id===dragTaskId;});
                      var toIdx=allTasks.findIndex(function(tk){return tk.id===t.id;});
                      if(fromIdx<0||toIdx<0)return pp;
                      var moved=allTasks.splice(fromIdx,1)[0];
                      allTasks.splice(toIdx,0,moved);
                      return Object.assign({},pp,{tasks:allTasks});
                    });});
                    setDragTaskId(null);setDragOverTaskId(null);
                  }}
                  onDragEnd={function(){setDragTaskId(null);setDragOverTaskId(null);}}
                  style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 0",overflow:"hidden",
                    borderBottom:"1px solid #1A1A1A",
                    background:dragOverTaskId===t.id?"rgba(204,0,0,.12)":"transparent",
                    borderRadius:dragOverTaskId===t.id?6:0,
                    opacity:dragTaskId===t.id?0.35:1,
                    transition:"background .15s,opacity .15s"}}>
                  <div style={{cursor:"grab",color:"#555",fontSize:16,flexShrink:0,
                    userSelect:"none",padding:"0 2px",touchAction:"none"}}>⠿</div>
                  <div onClick={function(){setProps(function(ps){return ps.map(function(pp){
                    return pp.id!==prop.id?pp:Object.assign({},pp,{tasks:(pp.tasks||[]).map(function(tk){
                      return tk.id!==t.id?tk:Object.assign({},tk,{done:!tk.done});
                    })});
                  });})}}
                    style={{width:22,height:22,borderRadius:5,border:"2px solid "+(t.done?"#22C55E":"#444"),background:t.done?"#22C55E":"transparent",
                    display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                    {t.done&&<span style={{color:"#FFF",fontSize:12,fontWeight:900}}>✓</span>}
                  </div>
                  <input value={t.label}
                    onChange={function(e){setProps(function(ps){return ps.map(function(pp){
                      return pp.id!==prop.id?pp:Object.assign({},pp,{tasks:(pp.tasks||[]).map(function(tk){
                        return tk.id!==t.id?tk:Object.assign({},tk,{label:e.target.value});
                      })});
                    });});}}
                    style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:13,
                      color:t.done?C.muted:C.white,textDecoration:t.done?"line-through":"none",
                      fontFamily:"Inter,sans-serif",padding:0}}/>
                  <button onClick={function(){setProps(function(ps){return ps.map(function(pp){
                    return pp.id!==prop.id?pp:Object.assign({},pp,{tasks:(pp.tasks||[]).filter(function(tk){return tk.id!==t.id;})});
                  });});}}
                    style={{background:"none",border:"none",color:"#444",fontSize:16,cursor:"pointer",flexShrink:0,padding:"0 4px"}}>×</button>
                </div>
              );})}
              {(function(){
                var secLabel=newTaskLabels[sec]||"";
                var showInput=newTaskLabels.hasOwnProperty("_show_"+sec);
                if(showInput){return(
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <input value={secLabel}
                      onChange={function(e){setNewTaskLabels(function(prev){var u=Object.assign({},prev);u[sec]=e.target.value;return u;});}}
                      placeholder="Task description..."
                      onKeyDown={function(e){
                        if(e.key==="Enter"&&secLabel.trim()){
                          var newTask={id:"t"+Date.now(),section:sec,label:secLabel.trim(),done:false};
                          setProps(function(ps){return ps.map(function(pp){return pp.id!==prop.id?pp:Object.assign({},pp,{tasks:(pp.tasks||[]).concat([newTask])});});});
                          setNewTaskLabels(function(prev){var u=Object.assign({},prev);delete u[sec];delete u["_show_"+sec];return u;});
                        }
                        if(e.key==="Escape"){setNewTaskLabels(function(prev){var u=Object.assign({},prev);delete u[sec];delete u["_show_"+sec];return u;});}
                      }}
                      autoFocus
                      style={{flex:1,fontSize:12,boxSizing:"border-box"}}/>
                    <button onClick={function(){
                      if(!secLabel.trim())return;
                      var newTask={id:"t"+Date.now(),section:sec,label:secLabel.trim(),done:false};
                      setProps(function(ps){return ps.map(function(pp){return pp.id!==prop.id?pp:Object.assign({},pp,{tasks:(pp.tasks||[]).concat([newTask])});});});
                      setNewTaskLabels(function(prev){var u=Object.assign({},prev);delete u[sec];delete u["_show_"+sec];return u;});
                    }} style={{background:"#CC0000",border:"none",borderRadius:6,color:"#FFF",fontSize:11,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>Add</button>
                    <button onClick={function(){setNewTaskLabels(function(prev){var u=Object.assign({},prev);delete u[sec];delete u["_show_"+sec];return u;});}}
                      style={{background:"transparent",border:"1px solid #444",borderRadius:6,color:"#888",fontSize:11,padding:"5px 8px",cursor:"pointer"}}>✕</button>
                  </div>
                );}
                return(
                  <button onClick={function(){setNewTaskLabels(function(prev){var u=Object.assign({},prev);u["_show_"+sec]=true;return u;});}}
                    style={{background:"none",border:"1px dashed #333",borderRadius:6,color:"#555",fontSize:11,cursor:"pointer",padding:"5px 10px",marginTop:6,width:"100%"}}>+ Add task</button>
                );
              })()} 
            </div>
          );})}  
          {showNewSec?(
            <div style={{display:"flex",gap:6,marginTop:8}}>
              <input value={newSecName} onChange={function(e){setNewSecName(e.target.value);}}
                placeholder="Section name (e.g. Bedrooms)"
                onKeyDown={function(e){
                  if(e.key==="Enter"&&newSecName.trim()){
                    var newTask={id:"t"+Date.now(),section:newSecName.trim(),label:"New task",done:false};
                    setProps(function(ps){return ps.map(function(pp){return pp.id!==prop.id?pp:Object.assign({},pp,{tasks:(pp.tasks||[]).concat([newTask])});});});
                    setNewSecName("");setShowNewSec(false);
                  }
                  if(e.key==="Escape"){setNewSecName("");setShowNewSec(false);}
                }}
                autoFocus
                style={{flex:1,boxSizing:"border-box"}}/>
              <button onClick={function(){
                if(!newSecName.trim())return;
                var newTask={id:"t"+Date.now(),section:newSecName.trim(),label:"New task",done:false};
                setProps(function(ps){return ps.map(function(pp){return pp.id!==prop.id?pp:Object.assign({},pp,{tasks:(pp.tasks||[]).concat([newTask])});});});
                setNewSecName("");setShowNewSec(false);
              }} style={{background:"#CC0000",border:"none",borderRadius:6,color:"#FFF",fontSize:11,fontWeight:700,padding:"6px 12px",cursor:"pointer"}}>Add</button>
              <button onClick={function(){setNewSecName("");setShowNewSec(false);}} style={{background:"transparent",border:"1px solid #444",borderRadius:6,color:"#888",fontSize:11,padding:"6px 10px",cursor:"pointer"}}>✕</button>
            </div>
          ):(
            <button onClick={function(){setShowNewSec(true);}}
              style={{background:"none",border:"1px dashed #333",borderRadius:6,color:"#555",fontSize:11,
              cursor:"pointer",padding:"6px 12px",marginTop:8,width:"100%"}}>+ Add new section</button>
          )}
        </div>
      )}

      {activeTab==="rooms"&&(
        <div>
          {safeRooms.map(function(r){
            var isEditing=editingRoomId===r.id;
            return(
              <div key={r.id} className="card" style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <span style={{fontSize:24}}>{r.icon||"🏠"}</span>
                  <div style={{flex:1,fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,letterSpacing:.5}}>{r.name}</div>
                  <button onClick={function(){setEditingRoomId(isEditing?null:r.id);setAddingRoom(false);}}
                    style={{background:isEditing?"#22C55E":"transparent",border:"1px solid "+(isEditing?"#22C55E":"#444"),borderRadius:6,color:isEditing?"#FFF":"#888",fontSize:10,fontWeight:700,padding:"4px 10px",cursor:"pointer",flexShrink:0}}>
                    {isEditing?"✓ DONE":"✏️ EDIT"}
                  </button>
                </div>
                {isEditing&&(
                  <div style={{background:"#1A1A1A",borderRadius:10,padding:14,marginBottom:14,border:"1px solid #CC0000"}}>
                    <div style={{fontSize:10,color:C.red,fontWeight:700,letterSpacing:.5,marginBottom:10,textTransform:"uppercase"}}>✏️ EDITING</div>
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:6}}>Icon</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {["🛋️","🛏️","🚿","🍳","🚪","🏠","🪴","🛁","🪟","🗄️","🧺","🏋️","🎮","📺","🪑"].map(function(em){return(
                          <button key={em} onClick={function(){setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){return rm.id!==r.id?rm:Object.assign({},rm,{icon:em});})});});});}}
                            style={{width:36,height:36,borderRadius:8,border:"2px solid "+(r.icon===em?"#CC0000":"#333"),background:r.icon===em?"rgba(204,0,0,.15)":"transparent",fontSize:18,cursor:"pointer"}}>{em}</button>
                        );})}
                      </div>
                    </div>
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:6}}>Room Name</div>
                      <input defaultValue={r.name} onBlur={function(e){var v=e.target.value;setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){return rm.id!==r.id?rm:Object.assign({},rm,{name:v});})});});});}}
                        style={{width:"100%",background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:14,fontWeight:600,padding:"8px 10px",outline:"none",boxSizing:"border-box"}}/>
                    </div>
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:6}}>Staging Guide</div>
                      <textarea defaultValue={r.guide||""} onBlur={function(e){var v=e.target.value;setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){return rm.id!==r.id?rm:Object.assign({},rm,{guide:v});})});});});}}
                        rows={3} placeholder="How should this room be staged?" style={{width:"100%",background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:12,padding:"8px 10px",outline:"none",resize:"vertical",fontFamily:"Inter,sans-serif",lineHeight:1.6,boxSizing:"border-box"}}/>
                    </div>
                    <button onClick={function(){setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).filter(function(rm){return rm.id!==r.id;})});});});setEditingRoomId(null);}}
                      style={{width:"100%",background:"transparent",border:"1px solid #EF4444",borderRadius:6,color:"#EF4444",fontSize:11,fontWeight:700,padding:"8px",cursor:"pointer"}}>🗑 REMOVE THIS ROOM</button>
                  </div>
                )}
                {!isEditing&&r.guide&&(
                  <div style={{background:C.surface,borderRadius:8,padding:12,marginBottom:12}}>
                    <div style={{fontSize:10,color:C.red,fontWeight:700,letterSpacing:.5,marginBottom:6,textTransform:"uppercase"}}>📋 Staging Guide</div>
                    <div style={{fontSize:12,color:C.offWhite,lineHeight:1.7}}>{r.guide}</div>
                  </div>
                )}
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:10,color:C.red,fontWeight:700,letterSpacing:.5,marginBottom:8,textTransform:"uppercase"}}>📸 Reference Photos / Videos</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                    {(r.refPhotos||[]).map(function(ph,i){return(
                      <div key={i} style={{position:"relative",flexShrink:0}}>
                        <img src={ph} alt={"ref "+(i+1)} onClick={function(){setGalleryIdx(galleryImages.findIndex(function(g){return g.url===ph;}));setShowGallery(true);}} style={{width:80,height:80,borderRadius:8,objectFit:"cover",display:"block",cursor:"pointer"}}/>
                        <button onClick={function(){setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){if(rm.id!==r.id)return rm;var ph2=(rm.refPhotos||[]).filter(function(_,j){return j!==i;});return Object.assign({},rm,{refPhotos:ph2});})});});});}}
                          style={{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:"50%",background:"#EF4444",border:"none",color:"#FFF",fontSize:10,cursor:"pointer",fontWeight:900}}>x</button>
                      </div>
                    );})}
                    {r.refVideo&&(
                      <div style={{position:"relative",flexShrink:0,width:80,height:80}}>
                        <div onClick={function(){
                          var ov=document.createElement("div");
                          ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.96);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:16px;";
                          var vid=document.createElement("video");vid.src=r.refVideo;vid.controls=true;vid.autoplay=true;vid.playsInline=true;
                          vid.style.cssText="max-width:95vw;max-height:80vh;border-radius:8px;";
                          ov.appendChild(vid);
                          var cl=document.createElement("button");cl.textContent="✕ Close";
                          cl.style.cssText="margin-top:12px;background:rgba(255,255,255,.2);border:none;color:#FFF;font-size:14px;padding:10px 24px;border-radius:20px;cursor:pointer;";
                          cl.onclick=function(){document.body.removeChild(ov);};
                          ov.appendChild(cl);document.body.appendChild(ov);
                        }} style={{cursor:"pointer",width:80,height:80,position:"relative"}}>
                          <video src={r.refVideo} style={{width:80,height:80,borderRadius:8,objectFit:"cover",display:"block",pointerEvents:"none"}}/>
                          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.3)",borderRadius:8,pointerEvents:"none"}}>
                            <span style={{fontSize:20,color:"#FFF"}}>▶</span>
                          </div>
                        </div>
                        <button onClick={function(){setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){return rm.id!==r.id?rm:Object.assign({},rm,{refVideo:null});})});});});}}
                          style={{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:"50%",background:"#EF4444",border:"none",color:"#FFF",fontSize:10,cursor:"pointer",fontWeight:900}}>x</button>
                      </div>
                    )}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <label style={{flex:1,minWidth:80,display:"flex",alignItems:"center",justifyContent:"center",gap:4,background:"transparent",border:"1px dashed #333",borderRadius:8,padding:"7px",cursor:"pointer",fontSize:10,color:"#555"}}>
                      📷 Camera
                      <input type="file" accept="image/*" capture="environment" style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                        onChange={function(e){var files=Array.from(e.target.files);files.forEach(function(file){var reader=new FileReader();reader.onload=function(ev){
                        var isReal=false;try{isReal=localStorage.getItem("turnready_is_real_user")==="true";}catch(ex){}
                        compressImage(ev.target.result,1200,1200,0.75,function(compressed){
                          if(isReal&&prop.id&&prop.id.includes("-")){
                            // Upload to Supabase Storage
                            uploadImageToStorage("property-media","rooms/"+prop.id+"/"+r.id+"/ref-"+Date.now()+".jpg",compressed).then(function(url){
                              setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){if(rm.id!==r.id)return rm;return Object.assign({},rm,{refPhotos:(rm.refPhotos||[]).concat([url])});})});});});
                            }).catch(function(){
                              setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){if(rm.id!==r.id)return rm;return Object.assign({},rm,{refPhotos:(rm.refPhotos||[]).concat([compressed])});})});});});
                            });
                          } else {
                            setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){if(rm.id!==r.id)return rm;return Object.assign({},rm,{refPhotos:(rm.refPhotos||[]).concat([compressed])});})});});});
                          }
                        });
                      };reader.readAsDataURL(file);});}}/>
                    </label>
                    <label style={{flex:1,minWidth:80,display:"flex",alignItems:"center",justifyContent:"center",gap:4,background:"transparent",border:"1px dashed #333",borderRadius:8,padding:"7px",cursor:"pointer",fontSize:10,color:"#555"}}>
                      📸 Gallery
                      <input type="file" accept="image/*" multiple style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                        onChange={function(e){var files=Array.from(e.target.files);files.forEach(function(file){var reader=new FileReader();reader.onload=function(ev){
                        var isReal=false;try{isReal=localStorage.getItem("turnready_is_real_user")==="true";}catch(ex){}
                        compressImage(ev.target.result,1200,1200,0.75,function(compressed){
                          if(isReal&&prop.id&&prop.id.includes("-")){
                            // Upload to Supabase Storage
                            uploadImageToStorage("property-media","rooms/"+prop.id+"/"+r.id+"/ref-"+Date.now()+".jpg",compressed).then(function(url){
                              setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){if(rm.id!==r.id)return rm;return Object.assign({},rm,{refPhotos:(rm.refPhotos||[]).concat([url])});})});});});
                            }).catch(function(){
                              setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){if(rm.id!==r.id)return rm;return Object.assign({},rm,{refPhotos:(rm.refPhotos||[]).concat([compressed])});})});});});
                            });
                          } else {
                            setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){if(rm.id!==r.id)return rm;return Object.assign({},rm,{refPhotos:(rm.refPhotos||[]).concat([compressed])});})});});});
                          }
                        });
                      };reader.readAsDataURL(file);});}}/>
                    </label>
                    {!r.refVideo&&(
                      <label style={{flex:1,minWidth:80,display:"flex",alignItems:"center",justifyContent:"center",gap:4,background:"transparent",border:"1px dashed #333",borderRadius:8,padding:"7px",cursor:"pointer",fontSize:10,color:"#555"}}>
                        🎬 Record
                        <input type="file" accept="video/*" capture="environment" style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                          onChange={function(e){
                            var file=e.target.files[0];if(!file)return;
                            var isReal=false;try{isReal=localStorage.getItem("turnready_is_real_user")==="true";}catch(ex){}
                            if(isReal&&prop.id&&prop.id.includes("-")){
                              var ov=URL.createObjectURL(file);
                              setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){return rm.id!==r.id?rm:Object.assign({},rm,{refVideo:ov,refVideoUploading:true});})});});});
                              var rd=new FileReader();rd.onload=function(ev2){
                                uploadVideoToStorage("room-videos","rooms/"+prop.id+"/"+r.id+"/ref-"+Date.now()+".mp4",ev2.target.result,file.type||"video/mp4").then(function(url){
                                  setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){return rm.id!==r.id?rm:Object.assign({},rm,{refVideo:url,refVideoUploading:false});})});});});
                                }).catch(function(){
                                  var rd2=new FileReader();rd2.onload=function(ev3){setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){return rm.id!==r.id?rm:Object.assign({},rm,{refVideo:ev3.target.result,refVideoUploading:false});})});});});};rd2.readAsDataURL(file);
                                });
                              };rd.readAsDataURL(file);
                            } else {
                              var reader=new FileReader();reader.onload=function(ev){setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){return rm.id!==r.id?rm:Object.assign({},rm,{refVideo:ev.target.result});})});});});};reader.readAsDataURL(file);
                            }
                          }}/>
                      </label>
                    )}
                    {!r.refVideo&&(
                      <label style={{flex:1,minWidth:80,display:"flex",alignItems:"center",justifyContent:"center",gap:4,background:"transparent",border:"1px dashed #333",borderRadius:8,padding:"7px",cursor:"pointer",fontSize:10,color:"#555"}}>
                        📁 Video
                        <input type="file" accept="video/*" style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                          onChange={function(e){
                            var file=e.target.files[0];if(!file)return;
                            var isReal=false;try{isReal=localStorage.getItem("turnready_is_real_user")==="true";}catch(ex){}
                            if(isReal&&prop.id&&prop.id.includes("-")){
                              var ov=URL.createObjectURL(file);
                              setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){return rm.id!==r.id?rm:Object.assign({},rm,{refVideo:ov,refVideoUploading:true});})});});});
                              var rd=new FileReader();rd.onload=function(ev2){
                                uploadVideoToStorage("room-videos","rooms/"+prop.id+"/"+r.id+"/ref-"+Date.now()+".mp4",ev2.target.result,file.type||"video/mp4").then(function(url){
                                  setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){return rm.id!==r.id?rm:Object.assign({},rm,{refVideo:url,refVideoUploading:false});})});});});
                                }).catch(function(){
                                  var rd2=new FileReader();rd2.onload=function(ev3){setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){return rm.id!==r.id?rm:Object.assign({},rm,{refVideo:ev3.target.result,refVideoUploading:false});})});});});};rd2.readAsDataURL(file);
                                });
                              };rd.readAsDataURL(file);
                            } else {
                              var reader=new FileReader();reader.onload=function(ev){setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).map(function(rm){return rm.id!==r.id?rm:Object.assign({},rm,{refVideo:ev.target.result});})});});});};reader.readAsDataURL(file);
                            }
                          }}/>
                      </label>
                    )}
                  {/* Photo Comparison */}
                                    {/* Cleaner Uploads Section - always visible to manager */}
                  <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #2A2A2A"}}>
                    <div style={{fontSize:10,color:"#CC0000",fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:8}}>🎥 CLEANER AFTER-CLEAN VIDEO</div>
                    {r.videoUploading&&(
                      <div style={{background:"rgba(99,91,255,.08)",border:"1px solid rgba(99,91,255,.3)",borderRadius:8,padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:16,height:16,border:"2px solid #8B5CF6",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                        <span style={{fontSize:11,color:"#8B5CF6",fontWeight:600}}>Uploading video to cloud...</span>
                      </div>
                    )}
                    {r.video&&!r.videoUploading&&r.video.startsWith("blob:")&&(
                      <div style={{fontSize:10,color:"#F59E0B",marginBottom:6}}>⚠️ Preview only — saving to cloud...</div>
                    )}
                    {r.video?(
                      <div>
                        <div style={{position:"relative",cursor:"pointer"}} onClick={function(){
                          var overlay=document.createElement("div");
                          overlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.96);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;";
                          overlay.onclick=function(e){if(e.target===overlay)document.body.removeChild(overlay);};
                          var vid=document.createElement("video");vid.src=r.video;vid.controls=true;vid.autoplay=true;
                          vid.style.cssText="max-width:95vw;max-height:85vh;border-radius:8px;";
                          overlay.appendChild(vid);
                          var close=document.createElement("button");close.textContent="✕ Close";
                          close.style.cssText="margin-top:16px;background:rgba(255,255,255,.15);border:none;color:#FFF;font-size:14px;padding:8px 20px;border-radius:20px;cursor:pointer;";
                          close.onclick=function(){document.body.removeChild(overlay);};
                          overlay.appendChild(close);document.body.appendChild(overlay);
                        }}>
                          <video src={r.video} style={{width:"100%",borderRadius:8,maxHeight:180,marginBottom:4,pointerEvents:"none"}}/>
                          <div style={{fontSize:10,color:"#22C55E",fontWeight:600,textAlign:"center",marginBottom:4}}>▶ Tap to view fullscreen</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                          <div style={{fontSize:10,color:"#888"}}>{r.videoName||"After-clean video"}</div>
                          <button onClick={function(){downloadMedia(r.video,r.videoName||"after-clean-"+r.name+".mp4");}}
                            style={{background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:6,padding:"3px 10px",color:"#22C55E",fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                            ⬇️ Download
                          </button>
                        </div>
                        {r.preVideo&&(
                          <div style={{marginTop:8}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                              <div style={{fontSize:10,color:"#F59E0B",fontWeight:700,letterSpacing:.5}}>📹 PRE-CLEAN VIDEO</div>
                              <button onClick={function(){downloadMedia(r.preVideo,"pre-clean-"+r.name+".mp4");}}
                                style={{background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:6,padding:"3px 10px",color:"#F59E0B",fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                                ⬇️ Download
                              </button>
                            </div>
                            <video src={r.preVideo} controls style={{width:"100%",borderRadius:8,maxHeight:140}}/>
                          </div>
                        )}
                      </div>
                    ):(
                      <div style={{background:"#111",borderRadius:8,padding:"12px",textAlign:"center",color:"#444",fontSize:11}}>
                        No upload yet
                      </div>
                    )}
                  </div>

                  {(r.refPhotos&&r.refPhotos.length>0||r.refVideo)&&r.video&&(
                    <div style={{marginTop:10}}>
                      <div style={{fontSize:10,color:"#3B82F6",fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:8}}>📸 BEFORE vs AFTER COMPARISON</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <div>
                          <div style={{fontSize:9,color:C.muted,fontWeight:600,marginBottom:4,textTransform:"uppercase",letterSpacing:.3}}>Reference</div>
                          {r.refPhotos&&r.refPhotos[0]?(
                            <img src={r.refPhotos[0]} onClick={function(){setGalleryIdx(0);setShowGallery(true);}}
                              style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:8,cursor:"pointer",border:"2px solid #2A2A2A"}}/>
                          ):r.refVideo?(
                            <video src={r.refVideo} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:8,border:"2px solid #2A2A2A"}}/>
                          ):null}
                        </div>
                        <div>
                          <div style={{fontSize:9,color:"#22C55E",fontWeight:700,marginBottom:4,textTransform:"uppercase",letterSpacing:.3}}>After Clean ✓</div>
                          <div style={{position:"relative"}}>
                      <video src={r.video} controls style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:8,border:"2px solid #22C55E"}}/>
                      <button onClick={function(){downloadMedia(r.video,"after-clean-"+r.name+".mp4");}}
                        style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.8)",border:"none",borderRadius:6,color:"#22C55E",fontSize:10,padding:"3px 8px",cursor:"pointer",fontWeight:700}}>⬇️</button>
                    </div>
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            );
          })}
          {addingRoom?(
            <div className="card" style={{marginBottom:14}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,marginBottom:12,color:C.red}}>+ NEW ROOM</div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:6}}>Icon</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["🛋️","🛏️","🚿","🍳","🚪","🏠","🪴","🛁","🪟","🗄️","🧺","🏋️","🎮","📺","🪑"].map(function(em){return(
                    <button key={em} onClick={function(){setNewRoomIcon(em);}}
                      style={{width:36,height:36,borderRadius:8,border:"2px solid "+(newRoomIcon===em?"#CC0000":"#333"),background:newRoomIcon===em?"rgba(204,0,0,.15)":"transparent",fontSize:18,cursor:"pointer"}}>{em}</button>
                  );})}
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:6}}>Room Name</div>
                <input value={newRoomName} onChange={function(e){setNewRoomName(e.target.value);}} autoFocus
                  placeholder="e.g. Guest Bedroom, Patio, Laundry Room..."
                  style={{width:"100%",background:"#2A2A2A",border:"1px solid #CC0000",borderRadius:8,color:"#FFF",fontSize:14,padding:"10px 12px",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={function(){
                  if(!newRoomName.trim())return;
                  var nr={id:"r"+Date.now(),name:newRoomName.trim(),icon:newRoomIcon,guide:"",clip:"",refPhotos:[],refVideo:null,video:null};
                  setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;return Object.assign({},p,{rooms:(p.rooms||[]).concat([nr])});});});
                  setNewRoomName("");setNewRoomIcon("🛋️");setAddingRoom(false);
                }} style={{flex:1,background:"#CC0000",border:"none",borderRadius:8,color:"#FFF",fontSize:12,fontWeight:900,fontFamily:"Arial Black,sans-serif",padding:"11px",cursor:"pointer"}}>ADD ROOM</button>
                <button onClick={function(){setAddingRoom(false);setNewRoomName("");setNewRoomIcon("🛋️");}}
                  style={{flex:1,background:"transparent",border:"1px solid #555",borderRadius:8,color:"#888",fontSize:12,padding:"11px",cursor:"pointer"}}>CANCEL</button>
              </div>
            </div>
          ):(
            <button onClick={function(){setAddingRoom(true);setEditingRoomId(null);}}
              style={{width:"100%",background:"transparent",border:"1px dashed #555",borderRadius:8,color:"#888",fontSize:11,fontWeight:700,padding:"10px",cursor:"pointer"}}>+ ADD ROOM</button>
          )}
        </div>
      )}
      
      {activeTab==="inventory"&&(
        <div className="card">
          <div style={{fontWeight:600,fontSize:13,marginBottom:14}}>Inventory / Supplies</div>
          {safeInventory.map(function(inv){
            // Show cleaner's reported status if available, else fall back to stock levels
            var cleanerSt=inv.cleanerStatus;
            var empty=cleanerSt?cleanerSt==="low":inv.inStock===0;
            var low=cleanerSt?cleanerSt==="med":(inv.inStock>0&&inv.inStock<inv.required);
            var full=cleanerSt?cleanerSt==="full":inv.inStock>=inv.required;
            var statusColor=empty?"#EF4444":low?"#F59E0B":"#22C55E";
            var statusLabel=empty?"Low":low?"Med":"Full";
            var isEditing=editingInvId===inv.id;
            return(
              <div key={inv.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 0",borderBottom:"1px solid #222"}}>
                {isEditing?(
                  <input autoFocus value={editingInvName} onChange={function(e){setEditingInvName(e.target.value);}}
                    onBlur={function(){
                      if(editingInvName.trim()){
                        setProps(function(ps){return ps.map(function(p){
                          if(p.id!==prop.id)return p;
                          return Object.assign({},p,{inventory:(p.inventory||[]).map(function(i){
                            return i.id!==inv.id?i:Object.assign({},i,{item:editingInvName.trim()});
                          })});
                        });});
                      }
                      setEditingInvId(null);
                    }}
                    onKeyDown={function(e){if(e.key==="Enter")e.target.blur();if(e.key==="Escape"){setEditingInvId(null);}}}
                    style={{flex:1,background:"#2A2A2A",border:"1px solid #CC0000",borderRadius:6,color:"#FFF",fontSize:13,padding:"4px 8px",outline:"none"}}/>
                ):(
                  <div style={{flex:1,fontSize:13}}>{inv.item}</div>
                )}
                <div style={{textAlign:"right",flexShrink:0}}>
                  <span style={{fontSize:12,fontWeight:700,color:statusColor}}>{statusLabel}</span>
                  {inv.cleanerStatus&&<div style={{fontSize:9,color:"#555",marginTop:1}}>by cleaner</div>}
                </div>
                <button onClick={function(){setEditingInvId(inv.id);setEditingInvName(inv.item);}}
                  style={{background:"transparent",border:"1px solid #444",borderRadius:6,color:"#888",fontSize:10,padding:"3px 7px",cursor:"pointer",flexShrink:0}}>Edit</button>
                <button onClick={function(){
                  setProps(function(ps){return ps.map(function(p){
                    if(p.id!==prop.id)return p;
                    return Object.assign({},p,{inventory:(p.inventory||[]).filter(function(i){return i.id!==inv.id;})});
                  });});
                }} style={{background:"transparent",border:"1px solid #EF4444",borderRadius:6,color:"#EF4444",fontSize:10,padding:"3px 7px",cursor:"pointer",flexShrink:0}}>Del</button>
              </div>
            );
          })}
          {addingInvItem?(
            <div style={{display:"flex",gap:8,marginTop:12,alignItems:"center"}}>
              <input autoFocus value={newInvName} onChange={function(e){setNewInvName(e.target.value);}}
                onKeyDown={function(e){
                  if(e.key==="Enter"&&newInvName.trim()){
                    var newInv={id:"i"+Date.now(),item:newInvName.trim(),required:1,inStock:1};
                    setProps(function(ps){return ps.map(function(p){
                      if(p.id!==prop.id)return p;
                      return Object.assign({},p,{inventory:(p.inventory||[]).concat([newInv])});
                    });});
                    setNewInvName("");setAddingInvItem(false);
                  }
                  if(e.key==="Escape"){setAddingInvItem(false);setNewInvName("");}
                }}
                placeholder="Item name — press Enter to save"
                style={{flex:1,background:"#2A2A2A",border:"1px solid #CC0000",borderRadius:6,color:"#FFF",fontSize:13,padding:"8px 10px",outline:"none"}}/>
              <button onClick={function(){setAddingInvItem(false);setNewInvName("");}}
                style={{background:"transparent",border:"1px solid #555",borderRadius:6,color:"#888",fontSize:11,padding:"7px 10px",cursor:"pointer"}}>Cancel</button>
            </div>
          ):(
            <button onClick={function(){setAddingInvItem(true);}}
              style={{width:"100%",marginTop:12,background:"transparent",border:"1px dashed #444",borderRadius:8,color:"#888",fontSize:11,fontWeight:700,padding:"9px",cursor:"pointer"}}>+ ADD ITEM</button>
          )}

        </div>
      )}


        {activeTab==="rating"&&(
          <div>
          <div className="card" style={{marginBottom:16}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,marginBottom:4}}>GUEST CONDITION RATING</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:14}}>Submitted by cleaner · tap any rating to edit or override</div>
            {[
              {stars:5,label:"Excellent",emoji:"⭐⭐⭐⭐⭐",desc:"Minimal trash. Light bed use. No heavy mess."},
              {stars:4,label:"Normal Stay",emoji:"⭐⭐⭐⭐",desc:"Trash present. Minor crumbs. Normal use."},
              {stars:3,label:"Moderate Mess",emoji:"⭐⭐⭐",desc:"Noticeable food residue. Hair buildup. Light stains."},
              {stars:2,label:"Heavy Turnover",emoji:"⭐⭐",desc:"Spills. Multiple stains. Strong odors. Excess trash."},
              {stars:1,label:"Problem Condition",emoji:"⭐",desc:"Damage. Missing items. Party signs. Severe odor."},
            ].map(function(r){
              var selected=prop.guestRating===r.stars;
              return(
                <div key={r.stars} onClick={function(){
                  setProps(function(ps){return ps.map(function(p){
                    return p.id!==prop.id?p:Object.assign({},p,{guestRating:selected?null:r.stars});
                  });});
                }} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:"1px solid #222",cursor:"pointer",
                  background:selected?"rgba(245,158,11,.08)":"transparent",borderRadius:selected?8:0,
                  opacity:prop.guestRating&&!selected?0.4:1}}>
                  <div style={{width:24,height:24,borderRadius:6,flexShrink:0,marginTop:2,
                    border:"2px solid "+(selected?"#F59E0B":"#444"),
                    background:selected?"#F59E0B":"transparent",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {selected&&<span style={{color:"#FFF",fontSize:13,fontWeight:900}}>✓</span>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:700,color:selected?"#F59E0B":"#FFF"}}>{r.label}</span>
                      <span style={{fontSize:12}}>{r.emoji}</span>
                    </div>
                    <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{r.desc}</div>
                    {r.stars===1&&<div style={{fontSize:11,color:"#EF4444",fontWeight:700,marginTop:4}}>⚠️ Contact host/manager immediately!</div>}
                  </div>
                </div>
              );
            })}
            {!prop.guestRating&&<div style={{fontSize:11,color:C.muted,textAlign:"center",paddingTop:8}}>No rating submitted by cleaner yet</div>}
            {prop.guestRating&&(
              <button onClick={function(){setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{guestRating:null});});});}}
                style={{width:"100%",marginTop:12,background:"transparent",border:"1px solid #555",borderRadius:8,color:"#888",fontSize:11,fontWeight:700,padding:"8px",cursor:"pointer"}}>Clear Rating</button>
            )}
            <div style={{marginTop:14,borderTop:"1px solid #2A2A2A",paddingTop:14}}>
              <div style={{fontSize:10,color:C.red,fontWeight:700,letterSpacing:.5,marginBottom:8,textTransform:"uppercase"}}>💬 Condition Notes</div>
              <textarea
                value={prop.ratingNotes||""}
                onChange={function(e){setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{ratingNotes:e.target.value});});});}}
                placeholder="Add notes about condition, damages, missing items, special findings..."
                rows={3}
                style={{width:"100%",background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:8,color:"#FFF",fontSize:12,padding:"10px 12px",outline:"none",resize:"vertical",fontFamily:"Inter,sans-serif",lineHeight:1.6,boxSizing:"border-box"}}/>
            </div>
          </div>

          {/* Guest Cleanliness Reviews */}
          {(prop.guestReviews||[]).length>0&&(
            <div className="card" style={{marginTop:12}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,marginBottom:4,color:"#3B82F6"}}>⭐ GUEST CLEANLINESS REVIEWS</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Submitted by guests via review link</div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,padding:"10px 0",borderBottom:"1px solid #222"}}>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:32,fontWeight:900,color:"#F59E0B"}}>
                  {((prop.guestReviews||[]).reduce(function(s,r){return s+r.rating;},0)/((prop.guestReviews||[]).length||1)).toFixed(1)}
                </div>
                <div>
                  <div style={{fontSize:18}}>{"⭐".repeat(Math.round((prop.guestReviews||[]).reduce(function(s,r){return s+r.rating;},0)/((prop.guestReviews||[]).length||1)))}</div>
                  <div style={{fontSize:11,color:C.muted}}>{(prop.guestReviews||[]).length} guest review{(prop.guestReviews||[]).length!==1?"s":""}</div>
                </div>
              </div>
              {(prop.guestReviews||[]).slice().reverse().map(function(rev,i){
                return(
                  <div key={i} style={{padding:"10px 0",borderBottom:"1px solid #1A1A1A"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{fontSize:14}}>{"⭐".repeat(rev.rating)}{"☆".repeat(5-rev.rating)}</div>
                      <div style={{fontSize:10,color:"#555"}}>{rev.date?new Date(rev.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):""}</div>
                    </div>
                    {rev.comment&&<div style={{fontSize:12,color:"#AAA",lineHeight:1.5,fontStyle:"italic"}}>"{rev.comment}"</div>}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        )}

        {activeTab==="notes"&&(
          <div style={{marginBottom:16}}>
            {/* Manager notes for cleaner */}
            <div className="card" style={{marginBottom:12}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:4,color:C.red}}>📋 MANAGER NOTES FOR CLEANER</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:10}}>Instructions for this specific cleaning day</div>
              <textarea
                value={prop.managerNotes||""}
                onChange={function(e){setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{managerNotes:e.target.value});});});}}
                placeholder="e.g. Key under mat. Guest allergic to bleach. Focus on master bathroom. Check under beds..."
                rows={4}
                style={{width:"100%",background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:8,color:"#FFF",fontSize:12,padding:"10px 12px",outline:"none",resize:"vertical",fontFamily:"Inter,sans-serif",lineHeight:1.6,boxSizing:"border-box"}}/>
            </div>
            {/* Cleaner notes back to manager */}
            <div className="card">
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:4,color:"#22C55E"}}>🧹 CLEANER NOTES</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:10}}>Notes and photos submitted by the cleaner</div>
              {(prop.cleanerNotes||"")?(
                <div style={{background:"#1A1A1A",borderRadius:8,padding:"10px 12px",fontSize:12,color:C.offWhite,lineHeight:1.6,marginBottom:10}}>{prop.cleanerNotes}</div>
              ):(
                <div style={{fontSize:12,color:C.muted,fontStyle:"italic",marginBottom:10}}>No notes from cleaner yet</div>
              )}
              {(prop.cleanerPhotos||[]).length>0&&(
                <div>
                  <div style={{fontSize:10,color:C.muted,marginBottom:8,fontWeight:600}}>PROPERTY PHOTOS FROM CLEANER</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {(prop.cleanerPhotos||[]).map(function(ph,i){
                      return(
                        <div key={i} style={{position:"relative",flexShrink:0}}>
                          <img src={ph} alt={"photo "+(i+1)} style={{width:90,height:90,borderRadius:8,objectFit:"cover",display:"block"}}/>
                          <button onClick={function(){setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;var photos=(p.cleanerPhotos||[]).filter(function(_,j){return j!==i;});return Object.assign({},p,{cleanerPhotos:photos});});});}}
                            style={{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:"50%",background:"#EF4444",border:"none",color:"#FFF",fontSize:10,cursor:"pointer",fontWeight:900}}>×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


      {activeTab==="info"&&(
        <div className="card" style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5}}>PROPERTY DETAILS</div>
            <button onClick={function(){setEditingInfo(!editingInfo);}}
              style={{background:editingInfo?"#22C55E":"transparent",border:"1px solid "+(editingInfo?"#22C55E":"#444"),borderRadius:6,color:editingInfo?"#FFF":"#888",fontSize:10,fontWeight:700,padding:"5px 12px",cursor:"pointer"}}>
              {editingInfo?"✓ DONE":"✏️ EDIT"}
            </button>
          </div>

          {/* Property Cover Photo Upload */}
          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:8}}>Cover Photo</div>
            <div style={{position:"relative",width:"100%",borderRadius:10,overflow:"hidden",marginBottom:8}}>
              <img src={prop.photo||"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"} alt="cover"
                style={{width:"100%",height:140,objectFit:"cover",borderRadius:10,display:"block"}}/>
            </div>
            {editingInfo&&(
              <div style={{display:"flex",gap:6}}>
                <label style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,background:"transparent",border:"1px dashed #444",borderRadius:6,padding:"7px",cursor:"pointer",fontSize:10,color:"#888",fontWeight:700}}>
                  📷 Take Photo
                  <input type="file" accept="image/*" capture="environment" style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                    onChange={function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){
                  var isReal=false;try{isReal=localStorage.getItem("turnready_is_real_user")==="true";}catch(ex){}
                  compressImage(ev.target.result,1200,800,0.8,function(compressed){
                    if(isReal&&prop.id&&prop.id.includes("-")){
                      uploadImageToStorage("property-media","properties/"+prop.id+"/cover-"+Date.now()+".jpg",compressed).then(function(url){
                        setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{photo:url});});});
                        updateProperty(prop.id,{photo:url}).catch(function(e){console.error("Cover photo save:",e.message);});
                      }).catch(function(){
                        setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{photo:compressed});});});
                      });
                    } else {
                      setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{photo:compressed});});});
                    }
                  });
                };r.readAsDataURL(f);}}/>
                </label>
                <label style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,background:"transparent",border:"1px dashed #444",borderRadius:6,padding:"7px",cursor:"pointer",fontSize:10,color:"#888",fontWeight:700}}>
                  📁 Upload Photo
                  <input type="file" accept="image/*" style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                    onChange={function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){
                  var isReal=false;try{isReal=localStorage.getItem("turnready_is_real_user")==="true";}catch(ex){}
                  compressImage(ev.target.result,1200,800,0.8,function(compressed){
                    if(isReal&&prop.id&&prop.id.includes("-")){
                      uploadImageToStorage("property-media","properties/"+prop.id+"/cover-"+Date.now()+".jpg",compressed).then(function(url){
                        setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{photo:url});});});
                        updateProperty(prop.id,{photo:url}).catch(function(e){console.error("Cover photo save:",e.message);});
                      }).catch(function(){
                        setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{photo:compressed});});});
                      });
                    } else {
                      setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{photo:compressed});});});
                    }
                  });
                };r.readAsDataURL(f);}}/>
                </label>
              </div>
            )}
          </div>

          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Property Name</div>
            {editingInfo?<input defaultValue={prop.name} onBlur={function(e){var v=e.target.value;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{name:v});});});}} style={{width:"100%",background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:13,padding:"6px 8px",outline:"none",boxSizing:"border-box"}}/>:<div style={{fontSize:13,fontWeight:500}}>{prop.name}</div>}
          </div>

          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Address</div>
            {editingInfo?<input defaultValue={prop.address} onBlur={function(e){var v=e.target.value;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{address:v});});});}} style={{width:"100%",background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:13,padding:"6px 8px",outline:"none",boxSizing:"border-box"}}/>:<div onClick={function(){
              if(prop.address){
                var q=encodeURIComponent(prop.address);
                // Opens in Apple Maps on iOS, Google Maps on Android/desktop
                window.open("https://maps.google.com/?q="+q,"_blank");
              }
            }} style={{fontSize:13,fontWeight:500,color:"#CC0000",cursor:prop.address?"pointer":"default",display:"flex",alignItems:"center",gap:6}}>
              {prop.address||"—"}
              {prop.address&&<span style={{fontSize:11}}>🗺️</span>}
            </div>}
          </div>

          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Property Type</div>
            {editingInfo?<select defaultValue={prop.type} onChange={function(e){var v=e.target.value;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{type:v});});});}} style={{width:"100%",background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:13,padding:"6px 8px",outline:"none"}}>
              <option>Airbnb</option><option>VRBO</option><option>Rental</option><option>Private</option><option>Commercial</option>
            </select>:<div style={{fontSize:13,fontWeight:500}}>{prop.type}</div>}
          </div>

          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Pay Per Clean</div>
            {editingInfo?<input type="number" defaultValue={prop.pay} onBlur={function(e){var v=Number(e.target.value);if(v>0)setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{pay:v});});});}} style={{width:"100%",background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:13,padding:"6px 8px",outline:"none",boxSizing:"border-box"}}/>:<div style={{fontSize:13,fontWeight:500,color:C.red}}>${prop.pay}.00</div>}
          </div>

          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Bedrooms / Bathrooms</div>
            {editingInfo?<div style={{display:"flex",gap:8}}>
              <input type="number" defaultValue={prop.bedrooms} placeholder="Beds" onBlur={function(e){var v=Number(e.target.value)||0;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{bedrooms:v});});});}} style={{flex:1,background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:13,padding:"6px 8px",outline:"none"}}/>
              <input type="number" min="0" step="0.5" defaultValue={prop.bathrooms} placeholder="Baths e.g. 3.5" onBlur={function(e){var v=Number(e.target.value)||0;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{bathrooms:v});});});}} style={{flex:1,background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:13,padding:"6px 8px",outline:"none"}}/>
            </div>:<div style={{fontSize:13,fontWeight:500}}>{prop.bedrooms} bed / {prop.bathrooms%1===0.5?Math.floor(prop.bathrooms)+"½":prop.bathrooms} bath</div>}
          </div>

          {/* Linen Bag Rate */}
          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Linen Bag Rate ($ per bag)</div>
            <div style={{fontSize:10,color:"#666",marginBottom:4}}>Amount paid to cleaner per bag of linens taken home</div>
            {editingInfo?<input type="number" min="0" defaultValue={prop.linenRate||10} placeholder="e.g. 10"
              onBlur={function(e){var v=Number(e.target.value)||10;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{linenRate:v});});});}}
              style={{width:"100%",boxSizing:"border-box",background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:13,padding:"6px 8px",outline:"none"}}/>
            :<div style={{fontSize:13,fontWeight:500,color:"#3B82F6"}}>${prop.linenRate||10} per bag</div>}
          </div>

          {/* Total Beds (mattresses) field */}
          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Total Beds (Mattresses)</div>
            <div style={{fontSize:10,color:"#666",marginBottom:4}}>How many actual beds/mattresses need to be made</div>
            {editingInfo?<input type="number" min="0" defaultValue={prop.totalBeds||""} placeholder="e.g. 6"
              onBlur={function(e){var v=Number(e.target.value)||0;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{totalBeds:v});});});}}
              style={{width:"100%",boxSizing:"border-box",background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:13,padding:"6px 8px",outline:"none"}}/>
            :<div style={{fontSize:13,fontWeight:500}}>{prop.totalBeds?prop.totalBeds+" beds total":"—"}</div>}
          </div>

          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Check Out / Check In</div>
            {editingInfo?<div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="time" defaultValue={prop.checkOut||"11:00"} onBlur={function(e){var v=e.target.value;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{checkOut:v});});});}} style={{flex:1,background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:12,padding:"6px 8px",outline:"none"}}/>
              <span style={{color:C.muted,fontSize:11}}>to</span>
              <input type="time" defaultValue={prop.checkIn||"16:00"} onBlur={function(e){var v=e.target.value;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{checkIn:v});});});}} style={{flex:1,background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:12,padding:"6px 8px",outline:"none"}}/>
            </div>:<div style={{fontSize:13,fontWeight:500}}>Check Out: {prop.checkOut||"11:00 AM"} · Check In: {prop.checkIn||"4:00 PM"}</div>}
          </div>

          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Turnover Type</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){setProps(function(ps){return ps.map(function(pp){return pp.id!==prop.id?pp:Object.assign({},pp,{sameDay:true});});});}}
                style={{flex:1,padding:"8px",borderRadius:8,border:"2px solid "+(prop.sameDay?"#CC0000":"#333"),background:prop.sameDay?"rgba(204,0,0,.12)":"transparent",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:16,marginBottom:2}}>🔥</div>
                <div style={{fontSize:11,fontWeight:700,color:prop.sameDay?"#CC0000":"#888"}}>Same-Day</div>
                <div style={{fontSize:9,color:"#666",marginTop:1}}>Guest in same day</div>
              </button>
              <button onClick={function(){setProps(function(ps){return ps.map(function(pp){return pp.id!==prop.id?pp:Object.assign({},pp,{sameDay:false});});});}}
                style={{flex:1,padding:"8px",borderRadius:8,border:"2px solid "+(!prop.sameDay?"#22C55E":"#333"),background:!prop.sameDay?"rgba(34,197,94,.08)":"transparent",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:16,marginBottom:2}}>✅</div>
                <div style={{fontSize:11,fontWeight:700,color:!prop.sameDay?"#22C55E":"#888"}}>Non Same-Day</div>
                <div style={{fontSize:9,color:"#666",marginTop:1}}>Flexible timing</div>
              </button>
            </div>
          </div>

          {/* 🔒 ACCESS & SECURITY */}
          <div style={{padding:"10px 0 4px",marginTop:4}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:10,fontWeight:900,color:"#CC0000",letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>🔒 ACCESS &amp; SECURITY</div>
            <div style={{fontSize:10,color:"#555",marginBottom:6}}>Only visible to you and cleaners assigned to this property</div>
          </div>

          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Property Access Code</div>
            <div style={{fontSize:10,color:"#666",marginBottom:4}}>Lockbox, keypad, or smart lock code to enter the property</div>
            {editingInfo?<input defaultValue={prop.accessCode||""} placeholder="e.g. #1234 or 8842"
              onBlur={function(e){var v=e.target.value;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{accessCode:v});});});}}
              style={{width:"100%",boxSizing:"border-box",background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:13,padding:"6px 8px",outline:"none"}}/>
            :<div style={{fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>🔑</span>
              <span>{prop.accessCode||"—"}</span>
            </div>}
          </div>

          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Supply Closet / Code &amp; Location</div>
            <div style={{fontSize:10,color:"#666",marginBottom:4}}>Where supplies are stored and how to access them</div>
            {editingInfo?<input defaultValue={prop.supplyInfo||""} placeholder="e.g. Hall closet, code: 5678"
              onBlur={function(e){var v=e.target.value;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{supplyInfo:v});});});}}
              style={{width:"100%",boxSizing:"border-box",background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:13,padding:"6px 8px",outline:"none"}}/>
            :<div style={{fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>📦</span>
              <span>{prop.supplyInfo||"—"}</span>
            </div>}
          </div>

          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Alarm Code</div>
            <div style={{fontSize:10,color:"#666",marginBottom:4}}>Entry/exit alarm code and disarm instructions</div>
            {editingInfo?<input defaultValue={prop.alarmCode||""} placeholder="e.g. 3344 — disarm within 30 sec of entry"
              onBlur={function(e){var v=e.target.value;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{alarmCode:v});});});}}
              style={{width:"100%",boxSizing:"border-box",background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:13,padding:"6px 8px",outline:"none"}}/>
            :<div style={{fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>🚨</span>
              <span>{prop.alarmCode||"—"}</span>
            </div>}
          </div>

          <div style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Description</div>
            {editingInfo?<textarea defaultValue={prop.description||""} onBlur={function(e){var v=e.target.value;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{description:v});});});}} rows={3} style={{width:"100%",background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:12,padding:"6px 8px",outline:"none",resize:"vertical",fontFamily:"Inter,sans-serif",boxSizing:"border-box"}}/>:<div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{prop.description||"No description added."}</div>}
          </div>

          {(prop.extraDetails||[]).map(function(d,i){
            return(
              <div key={i} style={{padding:"9px 0",borderBottom:"1px solid "+(C.border)}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>{d.key}</div>
                {editingInfo?<div style={{display:"flex",gap:6}}>
                  <input defaultValue={d.val} onBlur={function(e){var v=e.target.value;var idx2=i;setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;var det=(p.extraDetails||[]).map(function(x,j){return j===idx2?{key:x.key,val:v}:x;});return Object.assign({},p,{extraDetails:det});});});}} style={{flex:1,background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:13,padding:"6px 8px",outline:"none"}}/>
                  <button onClick={function(){var idx2=i;setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;var det=(p.extraDetails||[]).filter(function(_,j){return j!==idx2;});return Object.assign({},p,{extraDetails:det});});});}} style={{background:"transparent",border:"1px solid #EF4444",borderRadius:6,color:"#EF4444",fontSize:12,padding:"4px 8px",cursor:"pointer",flexShrink:0}}>×</button>
                </div>:<div style={{fontSize:13,fontWeight:500}}>{d.val}</div>}
              </div>
            );
          })}

          {editingInfo&&(
            addingDetail?(
              <div style={{marginTop:12}}>
                <input value={newDetailKey} onChange={function(e){setNewDetailKey(e.target.value);}} placeholder="Label (e.g. WiFi Password, Access Code)" style={{width:"100%",background:"#2A2A2A",border:"1px solid #CC0000",borderRadius:6,color:"#FFF",fontSize:12,padding:"7px 10px",outline:"none",marginBottom:6,boxSizing:"border-box"}}/>
                <input value={newDetailVal} onChange={function(e){setNewDetailVal(e.target.value);}} placeholder="Value" style={{width:"100%",background:"#2A2A2A",border:"1px solid #444",borderRadius:6,color:"#FFF",fontSize:12,padding:"7px 10px",outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={function(){
                    if(!newDetailKey.trim())return;
                    var k=newDetailKey.trim();var v=newDetailVal.trim();
                    setProps(function(ps){return ps.map(function(p){
                      if(p.id!==prop.id)return p;
                      return Object.assign({},p,{extraDetails:(p.extraDetails||[]).concat([{key:k,val:v}])});
                    });});
                    setNewDetailKey("");setNewDetailVal("");setAddingDetail(false);
                  }} style={{flex:1,background:"#CC0000",border:"none",borderRadius:6,color:"#FFF",fontSize:11,fontWeight:900,fontFamily:"Arial Black,sans-serif",padding:"9px",cursor:"pointer"}}>ADD</button>
                  <button onClick={function(){setAddingDetail(false);setNewDetailKey("");setNewDetailVal("");}} style={{flex:1,background:"transparent",border:"1px solid #555",borderRadius:6,color:"#888",fontSize:11,padding:"9px",cursor:"pointer"}}>CANCEL</button>
                </div>
              </div>
            ):(
              <button onClick={function(){setAddingDetail(true);}} style={{width:"100%",marginTop:12,background:"transparent",border:"1px dashed #444",borderRadius:8,color:"#888",fontSize:11,fontWeight:700,padding:"9px",cursor:"pointer"}}>+ ADD DETAIL</button>
            )
          )}
        </div>
      )}
      {/* Fullscreen Gallery Modal */}
      {showGallery&&galleryImages.length>0&&(
        <div style={{position:"fixed",inset:0,background:"#000",zIndex:500,display:"flex",flexDirection:"column"}}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",flexShrink:0}}>
            <button onClick={function(){setShowGallery(false);}} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,color:"#FFF",fontSize:13,fontWeight:700,padding:"6px 12px",cursor:"pointer"}}>✕ Close</button>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,color:"#FFF"}}>{prop.name}</div>
            <div style={{fontSize:12,color:"#888"}}>{galleryIdx+1} / {galleryImages.length}</div>
          </div>

          {/* Main image */}
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}
            onTouchStart={function(e){window._gts=e.touches[0].clientX;}}
            onTouchEnd={function(e){
              var dx=e.changedTouches[0].clientX-(window._gts||0);
              if(dx<-50&&galleryIdx<galleryImages.length-1)setGalleryIdx(galleryIdx+1);
              if(dx>50&&galleryIdx>0)setGalleryIdx(galleryIdx-1);
            }}>
            {/* Prev arrow */}
            {galleryIdx>0&&(
              <button onClick={function(){setGalleryIdx(galleryIdx-1);}}
                style={{position:"absolute",left:12,zIndex:10,background:"rgba(0,0,0,.5)",border:"none",borderRadius:"50%",width:40,height:40,color:"#FFF",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>{"<"}</button>
            )}
            {galleryImages[galleryIdx].isVideo?(
              <video src={galleryImages[galleryIdx].url} controls autoPlay style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
            ):(
              <img src={galleryImages[galleryIdx].url} alt={galleryImages[galleryIdx].label}
                style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
            )}
            {/* Next arrow */}
            {galleryIdx<galleryImages.length-1&&(
              <button onClick={function(){setGalleryIdx(galleryIdx+1);}}
                style={{position:"absolute",right:12,zIndex:10,background:"rgba(0,0,0,.5)",border:"none",borderRadius:"50%",width:40,height:40,color:"#FFF",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>{">"}</button>
            )}
          </div>

          {/* Label */}
          <div style={{padding:"10px 20px",textAlign:"center",flexShrink:0}}>
            <div style={{fontSize:13,color:"#FFF",fontWeight:600,marginBottom:4}}>{galleryImages[galleryIdx].label}</div>
            {galleryImages[galleryIdx].isAfter&&<div style={{fontSize:11,color:"#22C55E",fontWeight:700}}>✓ After Clean</div>}
            {galleryImages[galleryIdx].isPre&&<div style={{fontSize:11,color:"#F59E0B",fontWeight:700}}>📹 Pre-Clean Arrival</div>}
            {galleryImages[galleryIdx].isCleaner&&<div style={{fontSize:11,color:"#3B82F6",fontWeight:700}}>📸 From Cleaner</div>}
          </div>

          {/* Thumbnail strip */}
          <div style={{height:72,flexShrink:0,overflowX:"auto",display:"flex",gap:6,padding:"8px 16px",background:"rgba(0,0,0,.5)",WebkitOverflowScrolling:"touch"}}>
            {galleryImages.map(function(img,i){
              return(
                <div key={i} onClick={function(){setGalleryIdx(i);}}
                  style={{width:56,height:56,borderRadius:6,overflow:"hidden",flexShrink:0,cursor:"pointer",
                    border:"2px solid "+(i===galleryIdx?"#CC0000":"transparent"),opacity:i===galleryIdx?1:.6}}>
                  {img.isVideo?(
                    <div style={{width:"100%",height:"100%",background:"#1A1A1A",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>▶</div>
                  ):(
                    <img src={img.url} alt={img.label} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PROPERTIES ───────────────────────────────────────────────────────────────
function Properties({props,setProps,cleaners,initialSel,onClearSel,availability,addNotification,user}){
  const [sel,setSel]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [showTemplates,setShowTemplates]=useState(false);
  const [selectedTemplate,setSelectedTemplate]=useState("");
  const [templates,setTemplates]=useState([
    {id:"tmpl1",name:"Studio / 1BR",icon:"🏠",color:"#3B82F6",tasks:[{id:"t1",section:"Arrival",label:"Turn on lights, fans, and all TVs — note what's not working",done:false},{id:"t2",section:"Arrival",label:"Walk the entire property once before touching anything",done:false},{id:"t3",section:"Arrival",label:"Check high-risk areas: kitchen, bathrooms, beds, patio",done:false},{id:"t4",section:"Arrival",label:"Look for hair buildup, stains, odors, broken items, or signs of a party",done:false},{id:"t5",section:"Arrival",label:"Photo/video any damage or heavy mess — notify Harvey if significant",done:false},{id:"t6",section:"Living & Dining",label:"Vacuum sofa, chairs, and under all furniture — check edges and corners",done:false},{id:"t7",section:"Living & Dining",label:"Fluff and align all cushions and throw pillows per staging guide",done:false},{id:"t8",section:"Living & Dining",label:"Wipe coffee table, side tables, and TV stand",done:false},{id:"t9",section:"Living & Dining",label:"Clean TV screen streak-free — wipe remotes and place neatly",done:false},{id:"t10",section:"Living & Dining",label:"Dust all eye-level surfaces: shelves, décor, blinds, windowsills",done:false},{id:"t11",section:"Living & Dining",label:"Wipe dining table (top, edges, legs) and align chairs evenly",done:false},{id:"t12",section:"Living & Dining",label:"Sanitize light switches and door handles",done:false},{id:"t13",section:"Living & Dining",label:"Mop hard floors — check corners and baseboards",done:false},{id:"t14",section:"Living & Dining",label:"FINAL CHECK: Furniture matches staging photos?",done:false},{id:"t15",section:"Kitchen",label:"Wipe countertops and backsplash spotless — no grease, crumbs, or streaks",done:false},{id:"t16",section:"Kitchen",label:"Clean sink, faucet, and handles — no odors or water spots",done:false},{id:"t17",section:"Kitchen",label:"Empty fridge of all guest food — wipe shelves, no spills or odors",done:false},{id:"t18",section:"Kitchen",label:"Clean microwave inside and out — no splatter",done:false},{id:"t19",section:"Kitchen",label:"Degrease stovetop and burner area — wipe control knobs",done:false},{id:"t20",section:"Kitchen",label:"Empty dishwasher — check filter, wipe door inside and out",done:false},{id:"t21",section:"Kitchen",label:"Wipe cabinet fronts — open all cabinets and drawers, check for crumbs",done:false},{id:"t22",section:"Kitchen",label:"Clean coffee maker, empty toaster, wipe all small appliances",done:false},{id:"t23",section:"Kitchen",label:"Remove trash, reline bin, sweep and mop floors including corners",done:false},{id:"t24",section:"Kitchen",label:"FINAL CHECK: Would you confidently cook and eat here right now?",done:false},{id:"t25",section:"Bathrooms",label:"Clean mirror streak-free — no water marks or fingerprints",done:false},{id:"t26",section:"Bathrooms",label:"Scrub sink basin spotless — polish faucet and handles",done:false},{id:"t27",section:"Bathrooms",label:"Scrub toilet fully: inside bowl, seat top and bottom, hinges, and base",done:false},{id:"t28",section:"Bathrooms",label:"Scrub shower walls and tub — no soap scum, hair in drain, or mildew",done:false},{id:"t29",section:"Bathrooms",label:"Check drawers and under-sink — wipe out hair, dust, or residue",done:false},{id:"t30",section:"Bathrooms",label:"Restock amenities: soap, shampoo, conditioner, TP folded to a point",done:false},{id:"t31",section:"Bathrooms",label:"Stage hand towels: clean, folded evenly, and centered",done:false},{id:"t32",section:"Bathrooms",label:"Sanitize light switches, door handles — wipe wall marks",done:false},{id:"t33",section:"Bathrooms",label:"Vacuum and mop floors — check corners and edges for hair",done:false},{id:"t34",section:"Bathrooms",label:"FINAL CHECK: Would you confidently shower and leave your items here?",done:false},{id:"t35",section:"Bedrooms",label:"Strip all beds — bag all used linens separately",done:false},{id:"t36",section:"Bedrooms",label:"Remake beds: sheets tight and wrinkle-free, pillows fluffed and squared",done:false},{id:"t37",section:"Bedrooms",label:"Check mattress fully covered — no hair on bedding or headboard",done:false},{id:"t38",section:"Bedrooms",label:"Dust all surfaces: headboard, nightstands, dressers, lamps, mirrors",done:false},{id:"t39",section:"Bedrooms",label:"Open all drawers and closets — check for guest items or debris",done:false},{id:"t40",section:"Bedrooms",label:"Sanitize light switches — wipe any wall marks",done:false},{id:"t41",section:"Bedrooms",label:"Vacuum floors thoroughly — including under-bed area and closet floor",done:false},{id:"t42",section:"Bedrooms",label:"Dust windowsills, blinds, and straighten curtains",done:false},{id:"t43",section:"Bedrooms",label:"FINAL CHECK: Would you sleep here tonight?",done:false},{id:"t44",section:"Patio & Outdoor",label:"Remove all trash, food residue, cups, or debris",done:false},{id:"t45",section:"Patio & Outdoor",label:"Sweep all walking areas — check for safety hazards",done:false},{id:"t46",section:"Patio & Outdoor",label:"Wipe furniture: tables, chairs, armrests, cushions",done:false},{id:"t47",section:"Patio & Outdoor",label:"Clean and cover grill — check propane is off",done:false},{id:"t48",section:"Patio & Outdoor",label:"Arrange furniture neatly per staging guide",done:false},{id:"t49",section:"Patio & Outdoor",label:"FINAL CHECK: Would guests feel comfortable relaxing here immediately?",done:false},{id:"t50",section:"Departure",label:"Full walkthrough completed as a guest",done:false},{id:"t51",section:"Departure",label:"All room standards passed: Kitchen, Bath, Bedrooms, Living Areas",done:false},{id:"t52",section:"Departure",label:"No missed hair, crumbs, odors, or staging issues",done:false},{id:"t53",section:"Departure",label:"All linens clean, folded, and stored properly",done:false},{id:"t54",section:"Departure",label:"Dishwasher empty",done:false},{id:"t55",section:"Departure",label:"Washer door cracked open",done:false},{id:"t56",section:"Departure",label:"Dryer lint trap cleaned",done:false},{id:"t57",section:"Departure",label:"Trash removed to exterior bins",done:false},{id:"t58",section:"Departure",label:"Thermostat set to host standard (Heat/AC: 73°)",done:false},{id:"t59",section:"Departure",label:"Ceiling fans set to low",done:false},{id:"t60",section:"Departure",label:"Overhead lights off",done:false},{id:"t61",section:"Departure",label:"Porch / exterior lights on",done:false},{id:"t62",section:"Departure",label:"Supply closets locked",done:false},{id:"t63",section:"Departure",label:"All exterior doors and windows locked",done:false},{id:"t64",section:"Departure",label:"Keys returned to proper location",done:false},{id:"t65",section:"Departure",label:"✅ I approve this unit for immediate guest check-in",done:false}]},
    {id:"tmpl2",name:"2BR / 3BR Standard",icon:"🏡",color:"#22C55E",tasks:[{id:"t1",section:"Arrival",label:"Turn on lights, fans, and all TVs — note what's not working",done:false},{id:"t2",section:"Arrival",label:"Walk the entire property once before touching anything",done:false},{id:"t3",section:"Arrival",label:"Check high-risk areas: kitchen, bathrooms, beds, patio",done:false},{id:"t4",section:"Arrival",label:"Look for hair buildup, stains, odors, broken items, or signs of a party",done:false},{id:"t5",section:"Arrival",label:"Photo/video any damage or heavy mess — notify Harvey if significant",done:false},{id:"t6",section:"Living & Dining",label:"Vacuum sofa, chairs, and under all furniture — check edges and corners",done:false},{id:"t7",section:"Living & Dining",label:"Fluff and align all cushions and throw pillows per staging guide",done:false},{id:"t8",section:"Living & Dining",label:"Wipe coffee table, side tables, and TV stand",done:false},{id:"t9",section:"Living & Dining",label:"Clean TV screen streak-free — wipe remotes and place neatly",done:false},{id:"t10",section:"Living & Dining",label:"Dust all eye-level surfaces: shelves, décor, blinds, windowsills",done:false},{id:"t11",section:"Living & Dining",label:"Wipe dining table (top, edges, legs) and align chairs evenly",done:false},{id:"t12",section:"Living & Dining",label:"Sanitize light switches and door handles",done:false},{id:"t13",section:"Living & Dining",label:"Mop hard floors — check corners and baseboards",done:false},{id:"t14",section:"Living & Dining",label:"FINAL CHECK: Furniture matches staging photos?",done:false},{id:"t15",section:"Kitchen",label:"Wipe countertops and backsplash spotless — no grease, crumbs, or streaks",done:false},{id:"t16",section:"Kitchen",label:"Clean sink, faucet, and handles — no odors or water spots",done:false},{id:"t17",section:"Kitchen",label:"Empty fridge of all guest food — wipe shelves, no spills or odors",done:false},{id:"t18",section:"Kitchen",label:"Clean microwave inside and out — no splatter",done:false},{id:"t19",section:"Kitchen",label:"Degrease stovetop and burner area — wipe control knobs",done:false},{id:"t20",section:"Kitchen",label:"Empty dishwasher — check filter, wipe door inside and out",done:false},{id:"t21",section:"Kitchen",label:"Wipe cabinet fronts — open all cabinets and drawers, check for crumbs",done:false},{id:"t22",section:"Kitchen",label:"Clean coffee maker, empty toaster, wipe all small appliances",done:false},{id:"t23",section:"Kitchen",label:"Remove trash, reline bin, sweep and mop floors including corners",done:false},{id:"t24",section:"Kitchen",label:"FINAL CHECK: Would you confidently cook and eat here right now?",done:false},{id:"t25",section:"Bathrooms",label:"Clean mirror streak-free — no water marks or fingerprints",done:false},{id:"t26",section:"Bathrooms",label:"Scrub sink basin spotless — polish faucet and handles",done:false},{id:"t27",section:"Bathrooms",label:"Scrub toilet fully: inside bowl, seat top and bottom, hinges, and base",done:false},{id:"t28",section:"Bathrooms",label:"Scrub shower walls and tub — no soap scum, hair in drain, or mildew",done:false},{id:"t29",section:"Bathrooms",label:"Check drawers and under-sink — wipe out hair, dust, or residue",done:false},{id:"t30",section:"Bathrooms",label:"Restock amenities: soap, shampoo, conditioner, TP folded to a point",done:false},{id:"t31",section:"Bathrooms",label:"Stage hand towels: clean, folded evenly, and centered",done:false},{id:"t32",section:"Bathrooms",label:"Sanitize light switches, door handles — wipe wall marks",done:false},{id:"t33",section:"Bathrooms",label:"Vacuum and mop floors — check corners and edges for hair",done:false},{id:"t34",section:"Bathrooms",label:"FINAL CHECK: Would you confidently shower and leave your items here?",done:false},{id:"t35",section:"Bedrooms",label:"Strip all beds — bag all used linens separately",done:false},{id:"t36",section:"Bedrooms",label:"Remake beds: sheets tight and wrinkle-free, pillows fluffed and squared",done:false},{id:"t37",section:"Bedrooms",label:"Check mattress fully covered — no hair on bedding or headboard",done:false},{id:"t38",section:"Bedrooms",label:"Dust all surfaces: headboard, nightstands, dressers, lamps, mirrors",done:false},{id:"t39",section:"Bedrooms",label:"Open all drawers and closets — check for guest items or debris",done:false},{id:"t40",section:"Bedrooms",label:"Sanitize light switches — wipe any wall marks",done:false},{id:"t41",section:"Bedrooms",label:"Vacuum floors thoroughly — including under-bed area and closet floor",done:false},{id:"t42",section:"Bedrooms",label:"Dust windowsills, blinds, and straighten curtains",done:false},{id:"t43",section:"Bedrooms",label:"FINAL CHECK: Would you sleep here tonight?",done:false},{id:"t44",section:"Patio & Outdoor",label:"Remove all trash, food residue, cups, or debris",done:false},{id:"t45",section:"Patio & Outdoor",label:"Sweep all walking areas — check for safety hazards",done:false},{id:"t46",section:"Patio & Outdoor",label:"Wipe furniture: tables, chairs, armrests, cushions",done:false},{id:"t47",section:"Patio & Outdoor",label:"Clean and cover grill — check propane is off",done:false},{id:"t48",section:"Patio & Outdoor",label:"Arrange furniture neatly per staging guide",done:false},{id:"t49",section:"Patio & Outdoor",label:"FINAL CHECK: Would guests feel comfortable relaxing here immediately?",done:false},{id:"t50",section:"Departure",label:"Full walkthrough completed as a guest",done:false},{id:"t51",section:"Departure",label:"All room standards passed: Kitchen, Bath, Bedrooms, Living Areas",done:false},{id:"t52",section:"Departure",label:"No missed hair, crumbs, odors, or staging issues",done:false},{id:"t53",section:"Departure",label:"All linens clean, folded, and stored properly",done:false},{id:"t54",section:"Departure",label:"Dishwasher empty",done:false},{id:"t55",section:"Departure",label:"Washer door cracked open",done:false},{id:"t56",section:"Departure",label:"Dryer lint trap cleaned",done:false},{id:"t57",section:"Departure",label:"Trash removed to exterior bins",done:false},{id:"t58",section:"Departure",label:"Thermostat set to host standard (Heat/AC: 73°)",done:false},{id:"t59",section:"Departure",label:"Ceiling fans set to low",done:false},{id:"t60",section:"Departure",label:"Overhead lights off",done:false},{id:"t61",section:"Departure",label:"Porch / exterior lights on",done:false},{id:"t62",section:"Departure",label:"Supply closets locked",done:false},{id:"t63",section:"Departure",label:"All exterior doors and windows locked",done:false},{id:"t64",section:"Departure",label:"Keys returned to proper location",done:false},{id:"t65",section:"Departure",label:"✅ I approve this unit for immediate guest check-in",done:false}]},
    {id:"tmpl3",name:"4BR+ Large Home",icon:"🏰",color:"#F59E0B",tasks:[{id:"t1",section:"Arrival",label:"Turn on lights, fans, and all TVs — note what's not working",done:false},{id:"t2",section:"Arrival",label:"Walk the entire property once before touching anything",done:false},{id:"t3",section:"Arrival",label:"Check high-risk areas: kitchen, bathrooms, beds, patio",done:false},{id:"t4",section:"Arrival",label:"Look for hair buildup, stains, odors, broken items, or signs of a party",done:false},{id:"t5",section:"Arrival",label:"Photo/video any damage or heavy mess — notify Harvey if significant",done:false},{id:"t6",section:"Living & Dining",label:"Vacuum sofa, chairs, and under all furniture — check edges and corners",done:false},{id:"t7",section:"Living & Dining",label:"Fluff and align all cushions and throw pillows per staging guide",done:false},{id:"t8",section:"Living & Dining",label:"Wipe coffee table, side tables, and TV stand",done:false},{id:"t9",section:"Living & Dining",label:"Clean TV screen streak-free — wipe remotes and place neatly",done:false},{id:"t10",section:"Living & Dining",label:"Dust all eye-level surfaces: shelves, décor, blinds, windowsills",done:false},{id:"t11",section:"Living & Dining",label:"Wipe dining table (top, edges, legs) and align chairs evenly",done:false},{id:"t12",section:"Living & Dining",label:"Sanitize light switches and door handles",done:false},{id:"t13",section:"Living & Dining",label:"Mop hard floors — check corners and baseboards",done:false},{id:"t14",section:"Living & Dining",label:"FINAL CHECK: Furniture matches staging photos?",done:false},{id:"t15",section:"Kitchen",label:"Wipe countertops and backsplash spotless — no grease, crumbs, or streaks",done:false},{id:"t16",section:"Kitchen",label:"Clean sink, faucet, and handles — no odors or water spots",done:false},{id:"t17",section:"Kitchen",label:"Empty fridge of all guest food — wipe shelves, no spills or odors",done:false},{id:"t18",section:"Kitchen",label:"Clean microwave inside and out — no splatter",done:false},{id:"t19",section:"Kitchen",label:"Degrease stovetop and burner area — wipe control knobs",done:false},{id:"t20",section:"Kitchen",label:"Empty dishwasher — check filter, wipe door inside and out",done:false},{id:"t21",section:"Kitchen",label:"Wipe cabinet fronts — open all cabinets and drawers, check for crumbs",done:false},{id:"t22",section:"Kitchen",label:"Clean coffee maker, empty toaster, wipe all small appliances",done:false},{id:"t23",section:"Kitchen",label:"Remove trash, reline bin, sweep and mop floors including corners",done:false},{id:"t24",section:"Kitchen",label:"FINAL CHECK: Would you confidently cook and eat here right now?",done:false},{id:"t25",section:"Bathrooms",label:"Clean mirror streak-free — no water marks or fingerprints",done:false},{id:"t26",section:"Bathrooms",label:"Scrub sink basin spotless — polish faucet and handles",done:false},{id:"t27",section:"Bathrooms",label:"Scrub toilet fully: inside bowl, seat top and bottom, hinges, and base",done:false},{id:"t28",section:"Bathrooms",label:"Scrub shower walls and tub — no soap scum, hair in drain, or mildew",done:false},{id:"t29",section:"Bathrooms",label:"Check drawers and under-sink — wipe out hair, dust, or residue",done:false},{id:"t30",section:"Bathrooms",label:"Restock amenities: soap, shampoo, conditioner, TP folded to a point",done:false},{id:"t31",section:"Bathrooms",label:"Stage hand towels: clean, folded evenly, and centered",done:false},{id:"t32",section:"Bathrooms",label:"Sanitize light switches, door handles — wipe wall marks",done:false},{id:"t33",section:"Bathrooms",label:"Vacuum and mop floors — check corners and edges for hair",done:false},{id:"t34",section:"Bathrooms",label:"FINAL CHECK: Would you confidently shower and leave your items here?",done:false},{id:"t35",section:"Bedrooms",label:"Strip all beds — bag all used linens separately",done:false},{id:"t36",section:"Bedrooms",label:"Remake beds: sheets tight and wrinkle-free, pillows fluffed and squared",done:false},{id:"t37",section:"Bedrooms",label:"Check mattress fully covered — no hair on bedding or headboard",done:false},{id:"t38",section:"Bedrooms",label:"Dust all surfaces: headboard, nightstands, dressers, lamps, mirrors",done:false},{id:"t39",section:"Bedrooms",label:"Open all drawers and closets — check for guest items or debris",done:false},{id:"t40",section:"Bedrooms",label:"Sanitize light switches — wipe any wall marks",done:false},{id:"t41",section:"Bedrooms",label:"Vacuum floors thoroughly — including under-bed area and closet floor",done:false},{id:"t42",section:"Bedrooms",label:"Dust windowsills, blinds, and straighten curtains",done:false},{id:"t43",section:"Bedrooms",label:"FINAL CHECK: Would you sleep here tonight?",done:false},{id:"t44",section:"Patio & Outdoor",label:"Remove all trash, food residue, cups, or debris",done:false},{id:"t45",section:"Patio & Outdoor",label:"Sweep all walking areas — check for safety hazards",done:false},{id:"t46",section:"Patio & Outdoor",label:"Wipe furniture: tables, chairs, armrests, cushions",done:false},{id:"t47",section:"Patio & Outdoor",label:"Clean and cover grill — check propane is off",done:false},{id:"t48",section:"Patio & Outdoor",label:"Arrange furniture neatly per staging guide",done:false},{id:"t49",section:"Patio & Outdoor",label:"FINAL CHECK: Would guests feel comfortable relaxing here immediately?",done:false},{id:"t50",section:"Departure",label:"Full walkthrough completed as a guest",done:false},{id:"t51",section:"Departure",label:"All room standards passed: Kitchen, Bath, Bedrooms, Living Areas",done:false},{id:"t52",section:"Departure",label:"No missed hair, crumbs, odors, or staging issues",done:false},{id:"t53",section:"Departure",label:"All linens clean, folded, and stored properly",done:false},{id:"t54",section:"Departure",label:"Dishwasher empty",done:false},{id:"t55",section:"Departure",label:"Washer door cracked open",done:false},{id:"t56",section:"Departure",label:"Dryer lint trap cleaned",done:false},{id:"t57",section:"Departure",label:"Trash removed to exterior bins",done:false},{id:"t58",section:"Departure",label:"Thermostat set to host standard (Heat/AC: 73°)",done:false},{id:"t59",section:"Departure",label:"Ceiling fans set to low",done:false},{id:"t60",section:"Departure",label:"Overhead lights off",done:false},{id:"t61",section:"Departure",label:"Porch / exterior lights on",done:false},{id:"t62",section:"Departure",label:"Supply closets locked",done:false},{id:"t63",section:"Departure",label:"All exterior doors and windows locked",done:false},{id:"t64",section:"Departure",label:"Keys returned to proper location",done:false},{id:"t65",section:"Departure",label:"✅ I approve this unit for immediate guest check-in",done:false}]},
    {id:"tmpl4",name:"Same-Day Rapid Turn",icon:"🔥",color:"#CC0000",tasks:[{id:"t1",section:"Arrival",label:"Turn on lights, fans, and all TVs — note what's not working",done:false},{id:"t2",section:"Arrival",label:"Walk the entire property once before touching anything",done:false},{id:"t3",section:"Arrival",label:"Check high-risk areas: kitchen, bathrooms, beds, patio",done:false},{id:"t4",section:"Arrival",label:"Look for hair buildup, stains, odors, broken items, or signs of a party",done:false},{id:"t5",section:"Arrival",label:"Photo/video any damage or heavy mess — notify Harvey if significant",done:false},{id:"t6",section:"Living & Dining",label:"Vacuum sofa, chairs, and under all furniture — check edges and corners",done:false},{id:"t7",section:"Living & Dining",label:"Fluff and align all cushions and throw pillows per staging guide",done:false},{id:"t8",section:"Living & Dining",label:"Wipe coffee table, side tables, and TV stand",done:false},{id:"t9",section:"Living & Dining",label:"Clean TV screen streak-free — wipe remotes and place neatly",done:false},{id:"t10",section:"Living & Dining",label:"Dust all eye-level surfaces: shelves, décor, blinds, windowsills",done:false},{id:"t11",section:"Living & Dining",label:"Wipe dining table (top, edges, legs) and align chairs evenly",done:false},{id:"t12",section:"Living & Dining",label:"Sanitize light switches and door handles",done:false},{id:"t13",section:"Living & Dining",label:"Mop hard floors — check corners and baseboards",done:false},{id:"t14",section:"Living & Dining",label:"FINAL CHECK: Furniture matches staging photos?",done:false},{id:"t15",section:"Kitchen",label:"Wipe countertops and backsplash spotless — no grease, crumbs, or streaks",done:false},{id:"t16",section:"Kitchen",label:"Clean sink, faucet, and handles — no odors or water spots",done:false},{id:"t17",section:"Kitchen",label:"Empty fridge of all guest food — wipe shelves, no spills or odors",done:false},{id:"t18",section:"Kitchen",label:"Clean microwave inside and out — no splatter",done:false},{id:"t19",section:"Kitchen",label:"Degrease stovetop and burner area — wipe control knobs",done:false},{id:"t20",section:"Kitchen",label:"Empty dishwasher — check filter, wipe door inside and out",done:false},{id:"t21",section:"Kitchen",label:"Wipe cabinet fronts — open all cabinets and drawers, check for crumbs",done:false},{id:"t22",section:"Kitchen",label:"Clean coffee maker, empty toaster, wipe all small appliances",done:false},{id:"t23",section:"Kitchen",label:"Remove trash, reline bin, sweep and mop floors including corners",done:false},{id:"t24",section:"Kitchen",label:"FINAL CHECK: Would you confidently cook and eat here right now?",done:false},{id:"t25",section:"Bathrooms",label:"Clean mirror streak-free — no water marks or fingerprints",done:false},{id:"t26",section:"Bathrooms",label:"Scrub sink basin spotless — polish faucet and handles",done:false},{id:"t27",section:"Bathrooms",label:"Scrub toilet fully: inside bowl, seat top and bottom, hinges, and base",done:false},{id:"t28",section:"Bathrooms",label:"Scrub shower walls and tub — no soap scum, hair in drain, or mildew",done:false},{id:"t29",section:"Bathrooms",label:"Check drawers and under-sink — wipe out hair, dust, or residue",done:false},{id:"t30",section:"Bathrooms",label:"Restock amenities: soap, shampoo, conditioner, TP folded to a point",done:false},{id:"t31",section:"Bathrooms",label:"Stage hand towels: clean, folded evenly, and centered",done:false},{id:"t32",section:"Bathrooms",label:"Sanitize light switches, door handles — wipe wall marks",done:false},{id:"t33",section:"Bathrooms",label:"Vacuum and mop floors — check corners and edges for hair",done:false},{id:"t34",section:"Bathrooms",label:"FINAL CHECK: Would you confidently shower and leave your items here?",done:false},{id:"t35",section:"Bedrooms",label:"Strip all beds — bag all used linens separately",done:false},{id:"t36",section:"Bedrooms",label:"Remake beds: sheets tight and wrinkle-free, pillows fluffed and squared",done:false},{id:"t37",section:"Bedrooms",label:"Check mattress fully covered — no hair on bedding or headboard",done:false},{id:"t38",section:"Bedrooms",label:"Dust all surfaces: headboard, nightstands, dressers, lamps, mirrors",done:false},{id:"t39",section:"Bedrooms",label:"Open all drawers and closets — check for guest items or debris",done:false},{id:"t40",section:"Bedrooms",label:"Sanitize light switches — wipe any wall marks",done:false},{id:"t41",section:"Bedrooms",label:"Vacuum floors thoroughly — including under-bed area and closet floor",done:false},{id:"t42",section:"Bedrooms",label:"Dust windowsills, blinds, and straighten curtains",done:false},{id:"t43",section:"Bedrooms",label:"FINAL CHECK: Would you sleep here tonight?",done:false},{id:"t44",section:"Patio & Outdoor",label:"Remove all trash, food residue, cups, or debris",done:false},{id:"t45",section:"Patio & Outdoor",label:"Sweep all walking areas — check for safety hazards",done:false},{id:"t46",section:"Patio & Outdoor",label:"Wipe furniture: tables, chairs, armrests, cushions",done:false},{id:"t47",section:"Patio & Outdoor",label:"Clean and cover grill — check propane is off",done:false},{id:"t48",section:"Patio & Outdoor",label:"Arrange furniture neatly per staging guide",done:false},{id:"t49",section:"Patio & Outdoor",label:"FINAL CHECK: Would guests feel comfortable relaxing here immediately?",done:false},{id:"t50",section:"Departure",label:"Full walkthrough completed as a guest",done:false},{id:"t51",section:"Departure",label:"All room standards passed: Kitchen, Bath, Bedrooms, Living Areas",done:false},{id:"t52",section:"Departure",label:"No missed hair, crumbs, odors, or staging issues",done:false},{id:"t53",section:"Departure",label:"All linens clean, folded, and stored properly",done:false},{id:"t54",section:"Departure",label:"Dishwasher empty",done:false},{id:"t55",section:"Departure",label:"Washer door cracked open",done:false},{id:"t56",section:"Departure",label:"Dryer lint trap cleaned",done:false},{id:"t57",section:"Departure",label:"Trash removed to exterior bins",done:false},{id:"t58",section:"Departure",label:"Thermostat set to host standard (Heat/AC: 73°)",done:false},{id:"t59",section:"Departure",label:"Ceiling fans set to low",done:false},{id:"t60",section:"Departure",label:"Overhead lights off",done:false},{id:"t61",section:"Departure",label:"Porch / exterior lights on",done:false},{id:"t62",section:"Departure",label:"Supply closets locked",done:false},{id:"t63",section:"Departure",label:"All exterior doors and windows locked",done:false},{id:"t64",section:"Departure",label:"Keys returned to proper location",done:false},{id:"t65",section:"Departure",label:"✅ I approve this unit for immediate guest check-in",done:false}]},
    {id:"tmpl_deep",name:"STR Deep Clean",icon:"🧹",color:"#8B5CF6",tasks:[
      {id:"dc_pre1",section:"Pre-Clean Walkthrough",label:"Walk entire home first — note heavy buildup, damage, stains, missing items",done:false},
      {id:"dc_pre2",section:"Pre-Clean Walkthrough",label:"Check vents, ceiling corners, baseboards, blinds, and doors throughout",done:false},
      {id:"dc_pre3",section:"Pre-Clean Walkthrough",label:"Check under all furniture and inside all cabinets, drawers, and closets",done:false},
      {id:"dc_pre4",section:"Pre-Clean Walkthrough",label:"Check all light fixtures, ceiling fans, switch plates, and window tracks",done:false},
      {id:"dc_pre5",section:"Pre-Clean Walkthrough",label:"Check walls for marks, dust, smudges — check floors along edges and corners",done:false},
      {id:"dc_b1",section:"Bedroom Deep Clean",label:"Strip beds — dust ceiling corners, fan blades, air vents, and light fixtures",done:false},
      {id:"dc_b2",section:"Bedroom Deep Clean",label:"Dust curtain rods, blind tops, headboards, and top edges of all furniture",done:false},
      {id:"dc_b3",section:"Bedroom Deep Clean",label:"Dust wall art, mirrors, window sills, and window frames",done:false},
      {id:"dc_b4",section:"Bedroom Deep Clean",label:"Deep clean closet — dust top shelf, wipe rods, shelves, inside corners, vacuum floor edges",done:false},
      {id:"dc_b5",section:"Bedroom Deep Clean",label:"Wipe dresser tops, fronts, sides, handles — wipe inside drawers",done:false},
      {id:"dc_b6",section:"Bedroom Deep Clean",label:"Wipe nightstands inside and out — clean behind and under them",done:false},
      {id:"dc_b7",section:"Bedroom Deep Clean",label:"Vacuum under bed fully — check bed frame slats and support edges for dust buildup",done:false},
      {id:"dc_b8",section:"Bedroom Deep Clean",label:"Inspect and vacuum mattress surface — wipe bed frame, rails, and footboard",done:false},
      {id:"dc_b9",section:"Bedroom Deep Clean",label:"Clean mirrors — spot clean wall marks — wipe door front, back, edges, light switches, outlet covers",done:false},
      {id:"dc_b10",section:"Bedroom Deep Clean",label:"Vacuum entire floor including edges, under bed, closet, and under furniture — mop if hard floor",done:false},
      {id:"dc_b11",section:"Bedroom Deep Clean",label:"Remake bed neatly — return furniture — final eye-level and floor-level inspection",done:false},
      {id:"dc_bth1",section:"Bathroom Deep Clean",label:"Remove trash, bath mats, towels, and all items from counters and shower/tub",done:false},
      {id:"dc_bth2",section:"Bathroom Deep Clean",label:"Dust exhaust vent cover, ceiling corners, light fixtures, top of mirror frame and cabinet edges",done:false},
      {id:"dc_bth3",section:"Bathroom Deep Clean",label:"Apply cleaner to tub, shower walls, door, fixtures, corners, and grout — let dwell",done:false},
      {id:"dc_bth4",section:"Bathroom Deep Clean",label:"Scrub tiles and grout lines, soap scum from walls and tub, around drain and corners",done:false},
      {id:"dc_bth5",section:"Bathroom Deep Clean",label:"Remove residue from shower door tracks — wipe and polish fixtures — clean shower glass",done:false},
      {id:"dc_bth6",section:"Bathroom Deep Clean",label:"Check for mildew or caulk issues — report if found",done:false},
      {id:"dc_bth7",section:"Bathroom Deep Clean",label:"Clean toilet — tank top, outside fully, seat top and bottom, rim, bowl interior, base, and behind toilet",done:false},
      {id:"dc_bth8",section:"Bathroom Deep Clean",label:"Scrub sink bowl and drain — wipe faucet, handles, backsplash, countertop fully",done:false},
      {id:"dc_bth9",section:"Bathroom Deep Clean",label:"Wipe vanity front, sides, drawers — clean inside drawers and inside cabinet under sink",done:false},
      {id:"dc_bth10",section:"Bathroom Deep Clean",label:"Check for leaks or water damage under sink — report if found",done:false},
      {id:"dc_bth11",section:"Bathroom Deep Clean",label:"Clean mirror streak-free — spot clean walls — wipe switches, outlet covers, door, towel bars, baseboards",done:false},
      {id:"dc_bth12",section:"Bathroom Deep Clean",label:"Vacuum/sweep floor — mop thoroughly — check behind door and around trash can area",done:false},
      {id:"dc_bth13",section:"Bathroom Deep Clean",label:"Reset towels, mats, toiletries — final smell and shine check on chrome, mirror, floor, and toilet base",done:false},
      {id:"dc_k1",section:"Kitchen Deep Clean",label:"Remove trash — clear counters — open all cabinets and drawers — pull movable appliances forward if safe",done:false},
      {id:"dc_k2",section:"Kitchen Deep Clean",label:"Dust ceiling corners, vents, top of cabinets, top of fridge, and light fixtures",done:false},
      {id:"dc_k3",section:"Kitchen Deep Clean",label:"Wipe cabinet fronts, handles, edges, and sides — clean inside upper and lower cabinets",done:false},
      {id:"dc_k4",section:"Kitchen Deep Clean",label:"Wipe inside drawers — remove crumbs — clean under sink cabinet floor and walls — check for leaks, pests",done:false},
      {id:"dc_k5",section:"Kitchen Deep Clean",label:"Scrub countertops fully — remove grease and sticky residue — clean backsplash and corners",done:false},
      {id:"dc_k6",section:"Kitchen Deep Clean",label:"Wipe around small appliances and under canisters, trays, and coffee station items",done:false},
      {id:"dc_k7",section:"Kitchen Deep Clean",label:"Scrub sink basin, edges, rim, faucet, handles, and drain — remove water spots",done:false},
      {id:"dc_k8",section:"Kitchen Deep Clean",label:"OVEN — clean exterior, door, handle, inside door glass, interior walls, bottom, racks, and storage drawer",done:false},
      {id:"dc_k9",section:"Kitchen Deep Clean",label:"MICROWAVE — clean exterior, handle, buttons, and inside top/sides/bottom and turntable",done:false},
      {id:"dc_k10",section:"Kitchen Deep Clean",label:"FRIDGE — clean exterior, handles, top, sides, inside shelves, drawers, bins, and door shelves — wipe gaskets",done:false},
      {id:"dc_k11",section:"Kitchen Deep Clean",label:"FRIDGE — clean behind and under if safe — FREEZER — clean inside shelves, remove ice residue, wipe door edges",done:false},
      {id:"dc_k12",section:"Kitchen Deep Clean",label:"DISHWASHER — clean exterior, controls, door edges, inside door, check and clear filter, wipe racks",done:false},
      {id:"dc_k13",section:"Kitchen Deep Clean",label:"Wipe baseboards, kick plates, corners — clean under and behind trash can area",done:false},
      {id:"dc_k14",section:"Kitchen Deep Clean",label:"Vacuum and mop floor thoroughly — hit all edges, corners, and under table and chairs",done:false},
      {id:"dc_k15",section:"Kitchen Deep Clean",label:"Return items neatly — make sink, faucet, and all appliance fronts shine — final check from doorway",done:false},
      {id:"dc_lr1",section:"Living Room Deep Clean",label:"Remove trash — remove sofa cushions — move lightweight décor and small furniture",done:false},
      {id:"dc_lr2",section:"Living Room Deep Clean",label:"Dust ceiling corners, ceiling fan, vents, light fixtures, curtain rods, and blind tops",done:false},
      {id:"dc_lr3",section:"Living Room Deep Clean",label:"Dust shelves, frames, wall art — wipe coffee table, side tables, TV stand top/front/sides",done:false},
      {id:"dc_lr4",section:"Living Room Deep Clean",label:"Dust electronics carefully — wipe lamps, lamp bases, décor, trays, remote holders",done:false},
      {id:"dc_lr5",section:"Living Room Deep Clean",label:"Vacuum under sofa cushions, creases, seams — check for crumbs, hair, and wrappers",done:false},
      {id:"dc_lr6",section:"Living Room Deep Clean",label:"Vacuum under sofa — spot clean sofa stains if approved — wipe leather/vinyl if applicable",done:false},
      {id:"dc_lr7",section:"Living Room Deep Clean",label:"Check and clean behind TV stand and behind sofa if accessible — clean baseboards behind furniture",done:false},
      {id:"dc_lr8",section:"Living Room Deep Clean",label:"Clean window sills and tracks — spot clean walls — wipe switches, outlets, and door handles",done:false},
      {id:"dc_lr9",section:"Living Room Deep Clean",label:"Vacuum rug and hard floor edges — vacuum under furniture — mop hard floors — check corners",done:false},
      {id:"dc_lr10",section:"Living Room Deep Clean",label:"Replace sofa cushions — fluff pillows — align décor — final eye-level and floor-level check",done:false},
      {id:"dc_dr1",section:"Dining Room Deep Clean",label:"Clear table — move chairs out — dust light fixture/chandelier, vents, wall décor, window sills and blinds",done:false},
      {id:"dc_dr2",section:"Dining Room Deep Clean",label:"Wipe table top, underside of edges, legs, and base — wipe all chair backs, seats, legs, and lower bars",done:false},
      {id:"dc_dr3",section:"Dining Room Deep Clean",label:"Check chair corners for buildup — clean baseboards and corners — spot clean walls — wipe switches",done:false},
      {id:"dc_dr4",section:"Dining Room Deep Clean",label:"Sweep/vacuum under table and chairs — mop floor — check for sticky spots — return chairs evenly",done:false},
      {id:"dc_la1",section:"Laundry Area Deep Clean",label:"Dust shelf above machines, vents — wipe top, control panels, fronts, sides, and doors of washer and dryer",done:false},
      {id:"dc_la2",section:"Laundry Area Deep Clean",label:"WASHER — wipe inside door/lid, rubber gasket, detergent tray and opening — check for mildew or odor",done:false},
      {id:"dc_la3",section:"Laundry Area Deep Clean",label:"DRYER — clean lint trap and slot — wipe inside door, drum edge, hinges, and seals",done:false},
      {id:"dc_la4",section:"Laundry Area Deep Clean",label:"DRYER VENT — inspect accessible vent — remove lint buildup — report blockage, damage, or fire hazard",done:false},
      {id:"dc_la5",section:"Laundry Area Deep Clean",label:"Wipe shelves, cabinets, behind detergent bottles — wipe baseboards and corners — mop floor",done:false},
      {id:"dc_ha1",section:"Hallways & Entry Deep Clean",label:"Dust ceiling corners, vents, light fixtures, wall art, and frames",done:false},
      {id:"dc_ha2",section:"Hallways & Entry Deep Clean",label:"Wipe handrails, banisters, stair spindles — wipe switches, outlets, doors, handles — spot clean walls",done:false},
      {id:"dc_ha3",section:"Hallways & Entry Deep Clean",label:"Vacuum stair edges, corners, and baseboards — mop hard stairs — vacuum/mop entry flooring",done:false},
      {id:"dc_ha4",section:"Hallways & Entry Deep Clean",label:"Straighten mats and entry décor — final first-impression check",done:false},
      {id:"dc_sc1",section:"Supply Closet & Linen Storage",label:"Empty closet — remove all linens, towels, and supplies — check for moisture, mildew, or pests — report",done:false},
      {id:"dc_sc2",section:"Supply Closet & Linen Storage",label:"Dust ceiling corners, vent covers, top shelf, light fixture, and door frame",done:false},
      {id:"dc_sc3",section:"Supply Closet & Linen Storage",label:"Wipe all shelves top to bottom including undersides, corners, and edges — dry completely",done:false},
      {id:"dc_sc4",section:"Supply Closet & Linen Storage",label:"Wipe closet walls, baseboards, door front and back, handles, and light switch",done:false},
      {id:"dc_sc5",section:"Supply Closet & Linen Storage",label:"Vacuum floor, corners, edges, and under shelving — mop if hard floor",done:false},
      {id:"dc_sc6",section:"Supply Closet & Linen Storage",label:"Inspect all linens — check for stains, hair, and lint — remove damaged — report low stock",done:false},
      {id:"dc_sc7",section:"Supply Closet & Linen Storage",label:"Fold all towels and linens uniformly — organize by type on proper shelves — rotate old to front",done:false},
      {id:"dc_sc8",section:"Supply Closet & Linen Storage",label:"Organize supplies by zone — no chemicals touching linens — bottles upright and lids closed",done:false},
      {id:"dc_sc9",section:"Supply Closet & Linen Storage",label:"Inventory check — count toilet paper, paper towels, trash bags, soap, cloths, gloves — report low stock",done:false},
      {id:"dc_fin1",section:"Final Deep Clean Inspection",label:"No visible dust on top surfaces",done:false},
      {id:"dc_fin2",section:"Final Deep Clean Inspection",label:"No hair or debris in corners",done:false},
      {id:"dc_fin3",section:"Final Deep Clean Inspection",label:"Baseboards visibly cleaner throughout entire property",done:false},
      {id:"dc_fin4",section:"Final Deep Clean Inspection",label:"Inside cabinets, cupboards, drawers cleaned",done:false},
      {id:"dc_fin5",section:"Final Deep Clean Inspection",label:"Inside oven, dishwasher, fridge, and freezer cleaned",done:false},
      {id:"dc_fin6",section:"Final Deep Clean Inspection",label:"Top of fridge cleaned — under beds cleaned — inside closets cleaned",done:false},
      {id:"dc_fin7",section:"Final Deep Clean Inspection",label:"Under bathroom sinks cleaned — under sofa cushions cleaned",done:false},
      {id:"dc_fin8",section:"Final Deep Clean Inspection",label:"Dryer lint area and accessible vent cleaned",done:false},
      {id:"dc_fin9",section:"Final Deep Clean Inspection",label:"Floors finished and edges detailed throughout",done:false},
      {id:"dc_fin10",section:"Final Deep Clean Inspection",label:"All rooms reset neatly — damage and maintenance issues documented",done:false},
      {id:"dc_fin11",section:"Final Deep Clean Inspection",label:"✅ Deep clean complete — property is fully restored to baseline standard",done:false},
    ]},
  ]);
  useEffect(function(){if(initialSel){setSel(initialSel);onClearSel&&onClearSel();};},[initialSel]);
  const [assignTarget,setAssignTarget]=useState(null);
  const [form,setForm]=useState({name:"",address:"",type:"Airbnb",pay:"",bedrooms:"",bathrooms:"",description:"",photo:""});

  async function addProp(){
    if(!form.name||!form.address||!form.pay)return;
    var newId="p"+Date.now();
    var localProp={
      id:newId,
      ...form,pay:Number(form.pay),bedrooms:Number(form.bedrooms)||1,bathrooms:Number(form.bathrooms)||1,
      photo:form.photo||"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
      status:"available",assignedTo:null,scheduledDate:"",scheduledTime:"",notes:"",checkIn:"16:00",checkOut:"11:00",sameDay:false,extraDetails:[],
      tasks:[{id:"t1",section:"Arrival",label:"Turn on lights, fans, and all TVs — note what's not working",done:false},{id:"t2",section:"Arrival",label:"Walk the entire property once before touching anything",done:false},{id:"t3",section:"Arrival",label:"Check high-risk areas: kitchen, bathrooms, beds, patio",done:false},{id:"t4",section:"Arrival",label:"Look for hair buildup, stains, odors, broken items, or signs of a party",done:false},{id:"t5",section:"Arrival",label:"Photo/video any damage or heavy mess — notify Harvey if significant",done:false},{id:"t6",section:"Living & Dining",label:"Vacuum sofa, chairs, and under all furniture — check edges and corners",done:false},{id:"t7",section:"Living & Dining",label:"Fluff and align all cushions and throw pillows per staging guide",done:false},{id:"t8",section:"Living & Dining",label:"Wipe coffee table, side tables, and TV stand",done:false},{id:"t9",section:"Living & Dining",label:"Clean TV screen streak-free — wipe remotes and place neatly",done:false},{id:"t10",section:"Living & Dining",label:"Dust all eye-level surfaces: shelves, décor, blinds, windowsills",done:false},{id:"t11",section:"Living & Dining",label:"Wipe dining table (top, edges, legs) and align chairs evenly",done:false},{id:"t12",section:"Living & Dining",label:"Sanitize light switches and door handles",done:false},{id:"t13",section:"Living & Dining",label:"Mop hard floors — check corners and baseboards",done:false},{id:"t14",section:"Living & Dining",label:"FINAL CHECK: Furniture matches staging photos?",done:false},{id:"t15",section:"Kitchen",label:"Wipe countertops and backsplash spotless — no grease, crumbs, or streaks",done:false},{id:"t16",section:"Kitchen",label:"Clean sink, faucet, and handles — no odors or water spots",done:false},{id:"t17",section:"Kitchen",label:"Empty fridge of all guest food — wipe shelves, no spills or odors",done:false},{id:"t18",section:"Kitchen",label:"Clean microwave inside and out — no splatter",done:false},{id:"t19",section:"Kitchen",label:"Degrease stovetop and burner area — wipe control knobs",done:false},{id:"t20",section:"Kitchen",label:"Empty dishwasher — check filter, wipe door inside and out",done:false},{id:"t21",section:"Kitchen",label:"Wipe cabinet fronts — open all cabinets and drawers, check for crumbs",done:false},{id:"t22",section:"Kitchen",label:"Clean coffee maker, empty toaster, wipe all small appliances",done:false},{id:"t23",section:"Kitchen",label:"Remove trash, reline bin, sweep and mop floors including corners",done:false},{id:"t24",section:"Kitchen",label:"FINAL CHECK: Would you confidently cook and eat here right now?",done:false},{id:"t25",section:"Bathrooms",label:"Clean mirror streak-free — no water marks or fingerprints",done:false},{id:"t26",section:"Bathrooms",label:"Scrub sink basin spotless — polish faucet and handles",done:false},{id:"t27",section:"Bathrooms",label:"Scrub toilet fully: inside bowl, seat top and bottom, hinges, and base",done:false},{id:"t28",section:"Bathrooms",label:"Scrub shower walls and tub — no soap scum, hair in drain, or mildew",done:false},{id:"t29",section:"Bathrooms",label:"Check drawers and under-sink — wipe out hair, dust, or residue",done:false},{id:"t30",section:"Bathrooms",label:"Restock amenities: soap, shampoo, conditioner, TP folded to a point",done:false},{id:"t31",section:"Bathrooms",label:"Stage hand towels: clean, folded evenly, and centered",done:false},{id:"t32",section:"Bathrooms",label:"Sanitize light switches, door handles — wipe wall marks",done:false},{id:"t33",section:"Bathrooms",label:"Vacuum and mop floors — check corners and edges for hair",done:false},{id:"t34",section:"Bathrooms",label:"FINAL CHECK: Would you confidently shower and leave your items here?",done:false},{id:"t35",section:"Bedrooms",label:"Strip all beds — bag all used linens separately",done:false},{id:"t36",section:"Bedrooms",label:"Remake beds: sheets tight and wrinkle-free, pillows fluffed and squared",done:false},{id:"t37",section:"Bedrooms",label:"Check mattress fully covered — no hair on bedding or headboard",done:false},{id:"t38",section:"Bedrooms",label:"Dust all surfaces: headboard, nightstands, dressers, lamps, mirrors",done:false},{id:"t39",section:"Bedrooms",label:"Open all drawers and closets — check for guest items or debris",done:false},{id:"t40",section:"Bedrooms",label:"Sanitize light switches — wipe any wall marks",done:false},{id:"t41",section:"Bedrooms",label:"Vacuum floors thoroughly — including under-bed area and closet floor",done:false},{id:"t42",section:"Bedrooms",label:"Dust windowsills, blinds, and straighten curtains",done:false},{id:"t43",section:"Bedrooms",label:"FINAL CHECK: Would you sleep here tonight?",done:false},{id:"t44",section:"Patio & Outdoor",label:"Remove all trash, food residue, cups, or debris",done:false},{id:"t45",section:"Patio & Outdoor",label:"Sweep all walking areas — check for safety hazards",done:false},{id:"t46",section:"Patio & Outdoor",label:"Wipe furniture: tables, chairs, armrests, cushions",done:false},{id:"t47",section:"Patio & Outdoor",label:"Clean and cover grill — check propane is off",done:false},{id:"t48",section:"Patio & Outdoor",label:"Arrange furniture neatly per staging guide",done:false},{id:"t49",section:"Patio & Outdoor",label:"FINAL CHECK: Would guests feel comfortable relaxing here immediately?",done:false},{id:"t50",section:"Departure",label:"Full walkthrough completed as a guest",done:false},{id:"t51",section:"Departure",label:"All room standards passed: Kitchen, Bath, Bedrooms, Living Areas",done:false},{id:"t52",section:"Departure",label:"No missed hair, crumbs, odors, or staging issues",done:false},{id:"t53",section:"Departure",label:"All linens clean, folded, and stored properly",done:false},{id:"t54",section:"Departure",label:"Dishwasher empty",done:false},{id:"t55",section:"Departure",label:"Washer door cracked open",done:false},{id:"t56",section:"Departure",label:"Dryer lint trap cleaned",done:false},{id:"t57",section:"Departure",label:"Trash removed to exterior bins",done:false},{id:"t58",section:"Departure",label:"Thermostat set to host standard (Heat/AC: 73°)",done:false},{id:"t59",section:"Departure",label:"Ceiling fans set to low",done:false},{id:"t60",section:"Departure",label:"Overhead lights off",done:false},{id:"t61",section:"Departure",label:"Porch / exterior lights on",done:false},{id:"t62",section:"Departure",label:"Supply closets locked",done:false},{id:"t63",section:"Departure",label:"All exterior doors and windows locked",done:false},{id:"t64",section:"Departure",label:"Keys returned to proper location",done:false},{id:"t65",section:"Departure",label:"✅ I approve this unit for immediate guest check-in",done:false}],
      inventory:[
        {id:"i1",item:"Toilet Paper",required:8,inStock:8},
        {id:"i2",item:"Paper Towels",required:4,inStock:4},
        {id:"i3",item:"Body Wash",required:4,inStock:4},
        {id:"i4",item:"Shampoo",required:4,inStock:4},
        {id:"i5",item:"Conditioner",required:4,inStock:4},
        {id:"i6",item:"Hand Soap",required:3,inStock:3},
        {id:"i7",item:"Dish Soap",required:2,inStock:2},
        {id:"i8",item:"Dishwasher Pods",required:10,inStock:10},
        {id:"i9",item:"Kitchen Trash Bags",required:6,inStock:6},
        {id:"i10",item:"Bathroom Trash Bags",required:6,inStock:6},
        {id:"i11",item:"Coffee",required:2,inStock:2},
        {id:"i12",item:"Creamer",required:2,inStock:2},
        {id:"i13",item:"Sugar",required:1,inStock:1},
        {id:"i14",item:"Water",required:12,inStock:12},
        {id:"i15",item:"Laundry Soap",required:1,inStock:1},
        {id:"i16",item:"Bleach",required:1,inStock:1},
        {id:"i17",item:"Dryer Sheets",required:1,inStock:1},
        {id:"i18",item:"Fabric Softener",required:1,inStock:1},
        {id:"i19",item:"Stain Remover",required:1,inStock:1},
        {id:"i20",item:"Lint Roller",required:1,inStock:1},
      ],
      rooms:[
        {id:"r1",name:"Living Room",icon:"🛋️",guide:"Stage per standard protocol.",clip:"Wide angle of staged living room.",refPhotos:["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80"],refVideo:null,video:null},
        {id:"r2",name:"Kitchen",icon:"🍳",guide:"Clear counters, aligned seating.",clip:"Clean kitchen counters.",refPhotos:["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80"],refVideo:null,video:null},
        {id:"r3",name:"Bathroom",icon:"🚿",guide:"Stage towels, clean mirror.",clip:"Bathroom towel staging.",refPhotos:["https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&q=80"],refVideo:null,video:null},
      ],
    };
    // Add to local state immediately
    setProps(function(ps){return ps.concat([localProp]);});
    setForm({name:"",address:"",type:"Airbnb",pay:"",bedrooms:"",bathrooms:"",description:"",photo:""});
    setShowAdd(false);
    // Save to Supabase in background
    if(user&&user.id&&user.id.includes("-")){
      try{
        var dbProp=await createProperty({
          manager_id:user.id,
          name:form.name.trim(),
          address:form.address.trim(),
          type:form.type||"Airbnb",
          pay:Number(form.pay),
          bedrooms:Number(form.bedrooms)||1,
          bathrooms:Number(form.bathrooms)||1,
          // Only save https:// URLs to DB, not base64
          photo:(form.photo&&form.photo.startsWith("http"))?form.photo:null,
          notes:"",
          checkIn:"4:00 PM",
          checkOut:"11:00 AM",
          sameDay:false,
          linenRate:10,
          totalBeds:Number(form.bedrooms)||1,
          tasks:localProp.tasks||[],
          rooms:localProp.rooms||[],
          inventory:localProp.inventory||[],
          schedule:[],
          cleanerPhotos:[],
          linenBagPhotos:[],
          cleanerNotes:"",
          linenBags:0,
          assignedTo:null,
        });
        if(dbProp&&dbProp.id){
          // Replace temp ID with real Supabase ID
          setProps(function(ps){return ps.map(function(p){
            if(p.id===newId)return Object.assign({},p,{id:dbProp.id});
            return p;
          });});
          // EXPLICITLY save tasks/rooms/inventory to DB (don't rely on auto-sync)
          var saveToast=document.createElement("div");
          saveToast.style.cssText="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1A1A1A;border:1px solid #333;color:#888;font-size:11px;padding:8px 16px;border-radius:20px;z-index:9999;";
          saveToast.textContent="💾 Saving to database...";
          document.body.appendChild(saveToast);
          try{
            await updateProperty(dbProp.id,{
              tasks:localProp.tasks||[],
              rooms:localProp.rooms||[],
              inventory:localProp.inventory||[],
              schedule:[],
              cleanerPhotos:[],
              linenBagPhotos:[],
              cleanerNotes:"",
              linenBags:0,
            });
            saveToast.style.background="#052e16";saveToast.style.borderColor="#22C55E";saveToast.style.color="#22C55E";
            saveToast.textContent="✅ Property saved to database!";
            setTimeout(function(){try{document.body.removeChild(saveToast);}catch(e){}},3000);
          }catch(saveErr){
            saveToast.style.background="#2d0000";saveToast.style.borderColor="#EF4444";saveToast.style.color="#EF4444";
            saveToast.textContent="❌ DB save failed: "+saveErr.message;
            setTimeout(function(){try{document.body.removeChild(saveToast);}catch(e){}},8000);
          }
          // Upload cover photo to Storage if it's base64
          if(form.photo&&form.photo.startsWith("data:image")){
            compressImage(form.photo,1200,800,0.8,function(compressed){
              uploadImageToStorage("property-media","properties/"+dbProp.id+"/cover-"+Date.now()+".jpg",compressed).then(function(url){
                setProps(function(ps){return ps.map(function(p){return p.id!==dbProp.id?p:Object.assign({},p,{photo:url});});});
                updateProperty(dbProp.id,{photo:url}).catch(function(e){console.error("Cover photo save:",e.message);});
              }).catch(function(e){console.error("Cover photo upload:",e.message);});
            });
          }
        }
      }catch(e){
        console.error("Supabase save failed:",e.message);
        // Property stays in local state even if Supabase fails
      }
    }
  }

  function assign(propId,cleanerId,date,time,twoCleanerData){
    var slotId="slot"+Date.now();
    var theProp=props.find(function(p){return p.id===propId;})||{name:"Property"};
    var newSlot={
      id:slotId,cleanerId:cleanerId,
      cleanerId2:twoCleanerData?twoCleanerData.cid2:null,
      date:date,time:time,
      status:cleanerId?"pending_acceptance":"open",
      assignedAt:cleanerId?new Date().toISOString():null,
      twoCleaners:!!twoCleanerData&&!!twoCleanerData.cid2,
      pay1:twoCleanerData?twoCleanerData.pay1:null,
      pay2:twoCleanerData?twoCleanerData.pay2:null,
      split1:twoCleanerData?twoCleanerData.split1:null,
      split2:twoCleanerData?twoCleanerData.split2:null,
      deepClean:twoCleanerData?twoCleanerData.deepClean:false,
    };
    setProps(function(ps){return ps.map(function(pp){
      if(pp.id!==propId)return pp;
      return Object.assign({},pp,{
        assignedTo:cleanerId||null,
        scheduledDate:date,
        scheduledTime:time,
        schedule:(pp.schedule||[]).concat([newSlot])
      });
    });});
    // Notify cleaner(s) of assignment
    if(cleanerId&&addNotification){
      addNotification({type:"assigned",icon:"📋",title:"New Job Assigned!",body:"You have been assigned to clean "+theProp.name+" on "+date+" at "+(time||"11:00")+". You have 8 hours to accept or decline.",forRole:"cleaner",forCleaner:cleanerId,navTo:"My Jobs",time:new Date().toISOString(),read:false});
    }
    if(twoCleanerData&&twoCleanerData.cid2&&addNotification){
      addNotification({type:"assigned",icon:"📋",title:"New Job Assigned!",body:"You have been assigned to clean "+theProp.name+" on "+date+" at "+(time||"11:00")+". You have 8 hours to accept or decline.",forRole:"cleaner",forCleaner:twoCleanerData.cid2,navTo:"My Jobs",time:new Date().toISOString(),read:false});
    }
    setAssignTarget(null);
  }

  // Render AssignModal as overlay regardless of which view is showing
  if(assignTarget) return(
    <div>
      <AssignModal prop={assignTarget} cleaners={cleaners} availability={availability} onAssign={assign} onClose={function(){setAssignTarget(null);}}/>
    </div>
  );

  // When a property is selected, load full JSONB data from Supabase
  useEffect(function(){
    if(!sel)return;
    var p=props.find(function(x){return x.id===sel;});
    if(!p||!p.id||!p.id.includes("-"))return;
    if(p._fullLoaded)return;
    var t=document.createElement("div");
    t.style.cssText="position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#1a1a2e;border:1px solid #4444ff;color:#8888ff;font-size:10px;padding:6px 14px;border-radius:12px;z-index:9999;";
    t.textContent="🔵 Loading "+p.name+" from DB...";
    document.body.appendChild(t);
    getPropertyFull(p.id).then(function(full){
      var tasks=(full&&full.tasks)||[];
      var rooms=(full&&full.rooms)||[];
      var inv=(full&&full.inventory)||[];
      t.textContent="🔵 Got: "+tasks.length+"t "+rooms.length+"r "+inv.length+"i — updating state...";
      setProps(function(ps){
        var updated=ps.map(function(pp){
          if(pp.id!==p.id)return pp;
          return Object.assign({},pp,{
            _fullLoaded:true,
            tasks:tasks.length>0?tasks:pp.tasks||[],
            rooms:rooms.length>0?rooms:pp.rooms||[],
            inventory:inv.length>0?inv:pp.inventory||[],
            cleanerPhotos:(full&&full.cleanerPhotos)||pp.cleanerPhotos||[],
            linenBagPhotos:(full&&full.linenBagPhotos)||pp.linenBagPhotos||[],
            cleanerNotes:(full&&full.cleanerNotes)||pp.cleanerNotes||"",
          });
        });
        var found=updated.find(function(x){return x.id===p.id;});
        setTimeout(function(){
          t.textContent="✅ State: "+(found?found.tasks.length+"t "+found.rooms.length+"r "+found.inventory.length+"i":"NOT FOUND");
          t.style.borderColor="#22C55E";t.style.color="#22C55E";t.style.background="#052e16";
          setTimeout(function(){try{document.body.removeChild(t);}catch(e){}},5000);
        },100);
        return updated;
      });
    }).catch(function(e){
      t.textContent="❌ "+e.message;
      t.style.borderColor="#EF4444";t.style.color="#EF4444";
      setTimeout(function(){try{document.body.removeChild(t);}catch(e){}},8000);
    });
  },[sel]);

  if(sel){
    var prop=props.find(p=>p.id===sel);
    if(!prop){
      // Property not found yet (still loading from Supabase) - show spinner
      return(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:200,gap:12}}>
          <div style={{width:24,height:24,border:"3px solid #333",borderTopColor:"#CC0000",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
          <div style={{fontSize:12,color:"#888"}}>Loading property...</div>
        </div>
      );
    }
    return <ErrorBoundary><PropDetail prop={prop} cleaner={cleaners.find(c=>c.id===prop.assignedTo)} onBack={()=>setSel(null)} onAssign={()=>setAssignTarget(prop)} templates={templates} setProps={setProps} cleaners={cleaners} user={user}/></ErrorBoundary>;
  }

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1}}>PROPERTIES</div>
        <button onClick={function(){setShowTemplates(!showTemplates);setShowAdd(false);}} style={{background:showTemplates?"rgba(204,0,0,.15)":"transparent",border:"1px solid "+(showTemplates?"#CC0000":"#444"),borderRadius:8,color:showTemplates?"#CC0000":"#888",fontSize:11,fontWeight:700,padding:"7px 10px",cursor:"pointer",marginRight:6}}>📋</button>
        <button onClick={()=>setShowAdd(true)} style={{background:"#CC0000",border:"none",borderRadius:8,color:"#FFF",fontSize:11,fontWeight:900,letterSpacing:.5,fontFamily:"Arial Black,sans-serif",padding:"7px 12px",cursor:"pointer",flexShrink:0}}>+ ADD</button>
      </div>
      {/* Templates Panel */}
      {showTemplates&&(
        <div style={{background:"#141414",borderRadius:12,padding:14,marginBottom:16,border:"1px solid rgba(204,0,0,.2)"}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,letterSpacing:.5,color:"#CC0000",marginBottom:4}}>📋 CHECKLIST TEMPLATES</div>
          <div style={{fontSize:11,color:"#888",marginBottom:14,lineHeight:1.5}}>Apply these templates to any property from its Tasks tab. Tap a property → Tasks → 📋 TEMPLATE button.</div>
          {templates.map(function(tmpl){return(
            <div key={tmpl.id} style={{background:"#0D0D0D",borderRadius:10,padding:12,marginBottom:8,border:"1px solid #2A2A2A",overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <span style={{fontSize:22,flexShrink:0}}>{tmpl.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.3,color:"#FFF",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tmpl.name}</div>
                  <div style={{fontSize:10,color:"#666"}}>{tmpl.tasks.length} tasks · {[...new Set(tmpl.tasks.map(function(t){return t.section;}))].length} sections</div>
                </div>
              </div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",overflow:"hidden"}}>
                {[...new Set(tmpl.tasks.map(function(t){return t.section;}))].slice(0,4).map(function(s){return(
                  <span key={s} style={{fontSize:9,background:"#1A1A1A",border:"1px solid #333",borderRadius:10,padding:"2px 7px",color:"#888",maxWidth:90,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flexShrink:0}}>{s}</span>
                );})}
                {[...new Set(tmpl.tasks.map(function(t){return t.section;}))].length>4&&<span style={{fontSize:9,color:"#555",flexShrink:0}}>+{[...new Set(tmpl.tasks.map(function(t){return t.section;}))].length-4} more</span>}
              </div>
            </div>
          );})}
          <div style={{fontSize:11,color:"#555",marginTop:8,textAlign:"center"}}>Go to any property → Tasks tab → tap 📋 TEMPLATE to apply</div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12}}>
        {props.map(pp=>{
          var cl=cleaners.find(c=>c.id===pp.assignedTo);
          var progress=pct(pp.tasks);
          return(
            <div key={pp.id} className="card hover" onClick={()=>setSel(pp.id)} style={{overflow:"hidden",padding:0}}>
              <div style={{height:140,overflow:"hidden",position:"relative",background:"linear-gradient(135deg,#1A1A1A,#2A1A1A)"}}>
                {pp.photo&&<img src={pp.photo} alt={pp.name} onError={e=>e.target.style.display="none"} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}}/>}
                {!pp.photo&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,opacity:.15}}>{pp.type==="Airbnb"?"🏠":"🏡"}</div>}
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 60%)"}}/>
                <div style={{position:"absolute",top:10,right:10,display:"flex",gap:5}}>
                  <span className="badge green">${pp.pay}.00</span>
                  <span className="badge gray">{pp.type}</span>
                  {pp.sameDay&&<span className="badge" style={{background:"rgba(204,0,0,.85)",color:"#FFF",fontSize:9,padding:"2px 6px",borderRadius:10,fontWeight:700}}>🔥 SAME-DAY</span>}
                </div>
                <div style={{position:"absolute",bottom:10,left:12,fontFamily:"Arial Black,sans-serif",fontWeight:900,fontSize:16,letterSpacing:.5}}>{pp.name}</div>
              </div>
              <div style={{padding:"14px 16px"}}>
                <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{pp.address}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{display:"flex",gap:10,fontSize:11,color:C.muted}}>
                    <span>🛏 {pp.bedrooms}</span><span>🚿 {pp.bathrooms}</span><span>📋 {pp.type}</span>
                  </div>
                  <div style={{fontWeight:700,color:C.red,fontSize:16,fontFamily:F.display}}>{fmt(pp.pay)}</div>
                </div>
                <div className="prog-bar"><div className="prog-fill" style={{width:(progress)+"%"}}/></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginTop:5}}>
                  <span>{(pp.tasks||[]).filter(t=>t.done).length}/{(pp.tasks||[]).length} tasks</span>
                  {cl&&<span>👤 {cl.name}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd&&(
        <div className="modal-bg" onClick={()=>setShowAdd(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1,marginBottom:20}}>ADD PROPERTY</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"1/-1"}}><label>Property Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Beachfront Condo"/></div>
              <div style={{gridColumn:"1/-1"}}><label>Address</label><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="123 Main St, City, State"/></div>
              <div><label>Property Type</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Airbnb</option><option>Rental</option><option>Residential</option><option>Commercial</option></select></div>
              <div><label>Pay Per Clean ($)</label><input type="number" value={form.pay} onChange={e=>setForm({...form,pay:e.target.value})} placeholder="150"/></div>
              <div><label>Bedrooms</label><input type="number" value={form.bedrooms} onChange={e=>setForm({...form,bedrooms:e.target.value})} placeholder="3"/></div>
              <div><label>Bathrooms</label><input type="number" value={form.bathrooms} onChange={e=>setForm({...form,bathrooms:e.target.value})} placeholder="2"/></div>
              <div style={{gridColumn:"1/-1"}}><label>Photo URL (optional)</label><input value={form.photo} onChange={e=>setForm({...form,photo:e.target.value})} placeholder="https://…"/></div>
              <div style={{gridColumn:"1/-1"}}><label>Description / Notes</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Check-in/out times, special instructions…"/></div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,background:"transparent",border:"1px solid #555",borderRadius:8,color:"#AAA",fontSize:11,fontWeight:900,fontFamily:"Arial Black,sans-serif",padding:"9px",cursor:"pointer",letterSpacing:.5}}>CANCEL</button>
              <button onClick={addProp} style={{flex:1,background:"#CC0000",border:"none",borderRadius:8,color:"#FFF",fontSize:11,fontWeight:900,fontFamily:"Arial Black,sans-serif",padding:"9px",cursor:"pointer",letterSpacing:.5}}>ADD PROPERTY</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

function AssignModal({prop,cleaners,availability,onAssign,onClose}){
  const [cid,setCid]=useState(prop.assignedTo||"");
  const [cid2,setCid2]=useState("");
  const [twoCleaners,setTwoCleaners]=useState(false);
  const [assigned,setAssigned]=useState(false);
  const [splitType,setSplitType]=useState("50/50");
  const [customSplit,setCustomSplit]=useState("50");
  const [isDeepClean,setIsDeepClean]=useState(false);
  const [date,setDate]=useState(prop.scheduledDate||"");
  const [time,setTime]=useState(prop.scheduledTime||"11:00");

  var pay=prop.pay||0;
  var split1=splitType==="custom"?Number(customSplit)||50:50;
  var split2=100-split1;
  var pay1=twoCleaners?Math.round(pay*(split1/100)*100)/100:pay;
  var pay2=twoCleaners?Math.round(pay*(split2/100)*100)/100:0;

  return(
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={function(e){e.stopPropagation();}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontWeight:900,fontSize:18,letterSpacing:1,marginBottom:16}}>ASSIGN JOB — {prop.name}</div>

        {/* Date */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:4}}>Date</label>
          <input type="date" value={date} onChange={function(e){setDate(e.target.value);}}
            style={{width:"100%",boxSizing:"border-box",
              colorScheme:"dark"}}/>
          {/* Show blocked dates warning under the picker */}
          {date&&cid&&(function(){
            var avail=availability&&availability[cid];
            if(!avail)return null;
            var dow=new Date(date+"T12:00:00").getDay();
            var dayNames=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
            var isRecurring=(avail.blockedDays||[]).includes(dow);
            var isSpecific=(avail.blockedDates||[]).includes(date);
            if(!isRecurring&&!isSpecific)return null;
            return(
              <div style={{marginTop:6,background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:6,padding:"6px 10px",fontSize:11,color:"#EF4444",display:"flex",alignItems:"center",gap:6}}>
                <span>🔴</span>
                <span>{(function(){var cl=(cleaners||[]).find(function(c){return c.id===cid;});return cl?cl.name.split(" ")[0]:"This cleaner";})()}{isRecurring?" is off every "+dayNames[dow]:""}{isSpecific?(isRecurring?" and has":" has")+" blocked this date":""}</span>
              </div>
            );
          })()}
        </div>

        {/* Time */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:4}}>Start Time</label>
          <input type="time" value={time} onChange={function(e){setTime(e.target.value);}} style={{width:"100%",boxSizing:"border-box"}}/>
        </div>

        {/* Primary Cleaner */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:4}}>
            {twoCleaners?"Cleaner 1 (Primary)":"Cleaner"}
          </label>
          <select value={cid} onChange={function(e){setCid(e.target.value);}} style={{width:"100%",boxSizing:"border-box"}}>
            <option value="">-- Select Cleaner --</option>
            {cleaners.map(function(c){
              var avail=availability&&availability[c.id];
              var dayBlocked=date&&avail&&(avail.blockedDays||[]).includes(new Date(date+"T12:00:00").getDay());
              var dateBlocked=date&&avail&&(avail.blockedDates||[]).includes(date);
              var unavail=dayBlocked||dateBlocked;
              var sameDayCount=date?(prop.schedule||[]).filter(function(s){return s.cleanerId===c.id&&s.date===date&&s.status!=="declined";}).length:0;
              return <option key={c.id} value={c.id}>{unavail?"🔴 ":sameDayCount>0?"🟡 ":""}{c.name}{sameDayCount>0?" (has job this day)":""} {c.role==="primary"?"⭐":""}{unavail?" (unavailable)":""}</option>;
            })}
          </select>
          {cid&&date&&availability&&availability[cid]&&(
            (availability[cid].blockedDates||[]).includes(date)||(availability[cid].blockedDays||[]).includes(new Date(date+"T12:00:00").getDay())
          )&&(
            <div style={{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:6,padding:"6px 10px",marginTop:6,fontSize:11,color:"#EF4444"}}>
              ⚠️ This cleaner marked this date as unavailable.
              {availability[cid].note&&<span style={{color:"#888"}}> Note: {availability[cid].note}</span>}
            </div>
          )}
          {cid&&date&&(function(){
            var sameDayJobs=(prop.schedule||[]).filter(function(s){return s.cleanerId===cid&&s.date===date&&s.status!=="declined";});
            if(!sameDayJobs.length)return null;
            return(
              <div style={{background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.3)",borderRadius:6,padding:"6px 10px",marginTop:6,fontSize:11,color:"#F59E0B",display:"flex",gap:6}}>
                <span>⚠️</span>
                <span>Already has a job at this property on this date. Check the time doesn't overlap.</span>
              </div>
            );
          })()}
        </div>

        {/* Deep Clean Toggle */}
        <div style={{marginBottom:12}}>
          <button onClick={function(){setIsDeepClean(!isDeepClean);}}
            style={{width:"100%",background:isDeepClean?"rgba(139,92,246,.15)":"transparent",border:"1.5px solid "+(isDeepClean?"#8B5CF6":"#333"),borderRadius:8,padding:"10px 14px",color:isDeepClean?"#8B5CF6":"#888",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"Arial Black,sans-serif",letterSpacing:.3}}>
            {isDeepClean?"🧹 DEEP CLEAN ASSIGNED":"🧹 MARK AS DEEP CLEAN?"}
          </button>
          {isDeepClean&&(
            <div style={{background:"rgba(139,92,246,.08)",border:"1px solid rgba(139,92,246,.2)",borderRadius:6,padding:"8px 12px",marginTop:6,fontSize:11,color:"#8B5CF6",lineHeight:1.5}}>
              ✓ Deep clean checklist will be added to this job. Cleaner will see a 🧹 DEEP CLEAN banner.
            </div>
          )}
        </div>

        {/* Two cleaners toggle */}
        <div style={{marginBottom:12}}>
          <button onClick={function(){setTwoCleaners(!twoCleaners);if(!twoCleaners)setCid2("");}}
            style={{width:"100%",background:twoCleaners?"rgba(59,130,246,.15)":"transparent",border:"1.5px solid "+(twoCleaners?"#3B82F6":"#333"),borderRadius:8,padding:"10px 14px",color:twoCleaners?"#3B82F6":"#888",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"Arial Black,sans-serif",letterSpacing:.3}}>
            {twoCleaners?"👥 2 CLEANERS ASSIGNED":"👤 ADD A SECOND CLEANER?"}
          </button>
        </div>

        {/* Second cleaner */}
        {twoCleaners&&(
          <div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:4}}>Cleaner 2</label>
              <select value={cid2} onChange={function(e){setCid2(e.target.value);}} style={{width:"100%",boxSizing:"border-box"}}>
                <option value="">-- Select Cleaner --</option>
                {cleaners.filter(function(c){return c.id!==cid;}).map(function(c){return <option key={c.id} value={c.id}>{c.name}</option>;})}
              </select>
            </div>

            {/* Pay split */}
            <div style={{background:"#1A1A1A",borderRadius:10,padding:14,marginBottom:12,border:"1px solid #2A2A2A"}}>
              <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Pay Split — Total: ${pay}</div>
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {["50/50","custom"].map(function(t){return(
                  <button key={t} onClick={function(){setSplitType(t);}}
                    style={{flex:1,padding:"7px",borderRadius:6,border:"1px solid "+(splitType===t?"#CC0000":"#333"),background:splitType===t?"rgba(204,0,0,.12)":"transparent",color:splitType===t?"#CC0000":"#888",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                    {t==="50/50"?"⚖️ 50/50":"✏️ Custom"}
                  </button>
                );})}
              </div>
              {splitType==="custom"&&(
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:10,color:"#888",marginBottom:4}}>Cleaner 1 gets: {customSplit}%</div>
                  <input type="range" min="10" max="90" step="5" value={customSplit}
                    onChange={function(e){setCustomSplit(e.target.value);}}
                    style={{width:"100%",accentColor:"#CC0000"}}/>
                  <div style={{fontSize:10,color:"#888",marginTop:2}}>Cleaner 2 gets: {100-Number(customSplit)}%</div>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div style={{background:"rgba(34,197,94,.08)",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#888",marginBottom:2}}>{cleaners.find(function(c){return c.id===cid;})?cleaners.find(function(c){return c.id===cid;}).name.split(" ")[0]:"Cleaner 1"}</div>
                  <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,color:"#22C55E"}}>${pay1.toFixed(0)}</div>
                  <div style={{fontSize:9,color:"#555"}}>{split1}%</div>
                </div>
                <div style={{background:"rgba(34,197,94,.08)",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#888",marginBottom:2}}>{cid2&&cleaners.find(function(c){return c.id===cid2;})?cleaners.find(function(c){return c.id===cid2;}).name.split(" ")[0]:"Cleaner 2"}</div>
                  <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,color:"#22C55E"}}>${pay2.toFixed(0)}</div>
                  <div style={{fontSize:9,color:"#555"}}>{split2}%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:8,marginTop:4}}>
          <button onClick={onClose} style={{flex:1,background:"transparent",border:"1px solid #333",borderRadius:8,padding:"10px",color:"#888",fontSize:11,fontWeight:700,cursor:"pointer"}}>CANCEL</button>
          <button onClick={function(){
            if(!cid||!date)return;
            var avCheck=availability&&availability[cid];
            if(avCheck&&date&&((avCheck.blockedDays||[]).includes(new Date(date+"T12:00:00").getDay())||(avCheck.blockedDates||[]).includes(date)))return;
            if(twoCleaners&&cid2){var avCheck2=availability&&availability[cid2];if(avCheck2&&date&&((avCheck2.blockedDays||[]).includes(new Date(date+"T12:00:00").getDay())||(avCheck2.blockedDates||[]).includes(date)))return;}
            onAssign(prop.id, cid, date, time, {cid2:twoCleaners?cid2:null,pay1:pay1,pay2:pay2,split1:split1,split2:split2,deepClean:isDeepClean});
            setAssigned(true);
            setTimeout(function(){onClose();},1800);
          }} style={(function(){
            var avail=availability&&availability[cid];
            var blocked=cid&&date&&avail&&((avail.blockedDays||[]).includes(new Date(date+"T12:00:00").getDay())||(avail.blockedDates||[]).includes(date));
            var avail2=twoCleaners&&cid2&&availability&&availability[cid2];
            var blocked2=cid2&&date&&avail2&&((avail2.blockedDays||[]).includes(new Date(date+"T12:00:00").getDay())||(avail2.blockedDates||[]).includes(date));
            var isBlocked=blocked||blocked2;
            return {flex:2,background:assigned?"#22C55E":isBlocked?"#2A2A2A":"#CC0000",border:"none",borderRadius:8,padding:"10px",color:isBlocked?"#555":"#FFF",fontSize:11,fontWeight:900,cursor:isBlocked?"not-allowed":"pointer",fontFamily:"Arial Black,sans-serif",letterSpacing:.5,transition:"background .3s"};
          })()}>
            {(function(){
              var avail=availability&&availability[cid];
              var blocked=cid&&date&&avail&&((avail.blockedDays||[]).includes(new Date(date+"T12:00:00").getDay())||(avail.blockedDates||[]).includes(date));
              var avail2=twoCleaners&&cid2&&availability&&availability[cid2];
              var blocked2=cid2&&date&&avail2&&((avail2.blockedDays||[]).includes(new Date(date+"T12:00:00").getDay())||(avail2.blockedDates||[]).includes(date));
              if(assigned)return "✓ ASSIGNED!";
              if(blocked||blocked2)return "⛔ CLEANER UNAVAILABLE";
              return twoCleaners&&cid2?"ASSIGN 2 CLEANERS":"ASSIGN JOB";
            })()}
          </button>
        </div>
      </div>
    </div>
  );
}


function Cleaners({cleaners,setCleaners,jobs,pendingCleaners,setPendingCleaners,allProps,setProps,user,initialSelected,onClearSelected,availability}){
  const [showAdd,setShowAdd]=useState(false);
  const [showInvite,setShowInvite]=useState(false);
  const [cleanerTab,setCleanerTab]=useState("info");
  const [teamView,setTeamView]=useState("roster"); // "roster" | "availability"
  const [availMonth,setAvailMonth]=useState(new Date().getMonth());
  const [availYear,setAvailYear]=useState(new Date().getFullYear());
  const [inviteCopied,setInviteCopied]=useState(false);
  const [viewCleaner,setViewCleaner]=useState(null);
  const [assignMode,setAssignMode]=useState(false);
  const [assignPropId,setAssignPropId]=useState("");
  const [assignDate,setAssignDate]=useState("");
  const [assignTime,setAssignTime]=useState("11:00");
  const [assignSuccess,setAssignSuccess]=useState(false);
  const [form,setForm]=useState({name:"",email:"",phone:"",role:"backup"});
  useEffect(()=>{
    if(initialSelected){setViewCleaner(initialSelected);onClearSelected&&onClearSelected();}
  },[initialSelected]);

  function add(){
    if(!form.name||!form.email)return;
    setCleaners(cs=>[...cs,{id:"c"+(Date.now()),...form,totalEarned:0,jobsCompleted:0,rating:5.0,avatar:initials(form.name),role:form.role||"backup",reviews:[]}]);
    setForm({name:"",email:"",phone:"",role:"backup"});setShowAdd(false);
  }
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1}}>TEAM</div>
        <div style={{display:"flex",gap:6}}>
          <button className="btn ghost sm" onClick={function(){setShowInvite(!showInvite);setShowAdd(false);}}>🔗 Invite</button>
          <button className="btn sm" onClick={function(){setShowAdd(!showAdd);setShowInvite(false);}}>+ Add</button>
        </div>
      </div>
      {/* View switcher */}
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {[["roster","👥 Roster"],["availability","📅 Availability"]].map(function(v){return(
          <button key={v[0]} onClick={function(){setTeamView(v[0]);}}
            style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"Arial Black,sans-serif",
              background:teamView===v[0]?"#CC0000":"transparent",
              borderColor:teamView===v[0]?"#CC0000":"#333",
              color:teamView===v[0]?"#FFF":C.muted}}>
            {v[1]}
          </button>
        );})}
      </div>
      {showInvite&&<div className="card" style={{marginBottom:16,border:"1px solid rgba(204,0,0,.3)"}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,letterSpacing:.5,color:"#CC0000",marginBottom:4}}>INVITE A CLEANER</div>
        <div style={{fontSize:12,color:"#888",marginBottom:14,lineHeight:1.6}}>Share the invite code with your cleaner. With the code they sign in instantly.</div>
        <div style={{background:"#0D0D0D",border:"1px solid #CC0000",borderRadius:10,padding:14,marginBottom:12,textAlign:"center"}}>
          <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Your Invite Code</div>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:26,fontWeight:900,letterSpacing:4,color:"#FFF",marginBottom:10}}>HARVEY2024</div>
          <button onClick={function(){if(navigator.clipboard)navigator.clipboard.writeText("HARVEY2024");setInviteCopied(true);setTimeout(function(){setInviteCopied(false);},2000);}}
            style={{background:"#CC0000",border:"none",borderRadius:6,padding:"7px 18px",color:"#FFF",fontSize:11,fontWeight:900,fontFamily:"Arial Black,sans-serif",cursor:"pointer"}}>
            {inviteCopied?"COPIED!":"COPY CODE"}
          </button>
        </div>
        <div style={{background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.2)",borderRadius:8,padding:"10px 12px",marginBottom:12,fontSize:11,color:"#888",lineHeight:1.6}}>
          Tell your cleaner: Open TurnReady, tap New Cleaner, fill in their info, enter the code <strong style={{color:"#FFF"}}>HARVEY2024</strong> and they will be signed in instantly with full access.
        </div>
        <div style={{background:"#0D0D0D",border:"1px solid #2A2A2A",borderRadius:8,padding:"12px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <div style={{fontSize:11,color:"#AAA",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>app.turnready.app</div>
          <button onClick={()=>{if(navigator.clipboard)navigator.clipboard.writeText("app.turnready.app");setInviteCopied(true);setTimeout(()=>setInviteCopied(false),2000);}} style={{background:"#CC0000",border:"none",borderRadius:6,padding:"6px 12px",color:"#FFF",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>{inviteCopied?"✓ Copied!":"Copy Link"}</button>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn" style={{flex:1}} onClick={()=>{var shareMsg="Hi! Join my cleaning team on TurnReady: app.turnready.app";if(navigator.share)navigator.share({title:"Join my TurnReady team",text:shareMsg});else if(navigator.clipboard){navigator.clipboard.writeText(shareMsg);setInviteCopied(true);setTimeout(()=>setInviteCopied(false),2000);}}}>📱 Share via Phone</button>
          <button className="btn ghost sm" onClick={()=>setShowInvite(false)}>Close</button>
        </div>
        <div style={{fontSize:10,color:"#555",marginTop:10,textAlign:"center"}}>Invite links are fully active after deployment.</div>
      </div>}
      {teamView!=="availability"&&(
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
        {cleaners.map(c=>{
          var cj=jobs.filter(j=>j.cleanerId===c.id);
          return(
            <div key={c.id} className="card" style={{cursor:"pointer"}} onClick={()=>{setViewCleaner(c);setAssignMode(false);}}>
              <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14}}>
                <div className="avatar" style={{width:44,height:44,fontSize:14,overflow:"hidden",padding:c.photo?0:undefined}}>{c.photo?<img src={c.photo} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:c.avatar}</div>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{fontWeight:600,fontSize:14}}>{c.name}</div>
                    <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:10,
                      background:(c.role||"backup")==="primary"?"rgba(34,197,94,.15)":"rgba(245,158,11,.15)",
                      color:(c.role||"backup")==="primary"?"#22C55E":"#F59E0B",
                      border:"1px solid "+((c.role||"backup")==="primary"?"rgba(34,197,94,.3)":"rgba(245,158,11,.3)")}}>
                      {(c.role||"backup")==="primary"?"PRIMARY":"BACKUP"}
                    </span>
                  </div><div style={{fontSize:11,color:C.muted}}>{c.email}</div></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
                {[[fmt(c.totalEarned),"Earned",C.red],[c.jobsCompleted,"Jobs",C.white],["⭐"+(c.rating),"Rating",C.warn]].map(([v,l,cl])=>(
                  <div key={l} style={{background:C.surface,borderRadius:7,padding:"9px 4px"}}>
                    <div style={{fontSize:14,fontWeight:700,color:cl}}>{v}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>{l}</div>
                  </div>
                ))}
              </div>
              {cj.length>0&&<div style={{marginTop:12,fontSize:11,color:C.muted}}>{cj.length} job{cj.length!==1?"s":""} assigned</div>}
            </div>
          );
        })}
      </div>
      )}
      {teamView==="availability"&&(
        <div>
          {/* Month navigator */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <button onClick={function(){
              if(availMonth===0){setAvailMonth(11);setAvailYear(availYear-1);}
              else setAvailMonth(availMonth-1);
            }} style={{background:"transparent",border:"1px solid #333",borderRadius:8,color:C.offWhite,padding:"6px 12px",cursor:"pointer",fontSize:14}}>‹</button>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,letterSpacing:.5}}>
              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][availMonth]} {availYear}
            </div>
            <button onClick={function(){
              if(availMonth===11){setAvailMonth(0);setAvailYear(availYear+1);}
              else setAvailMonth(availMonth+1);
            }} style={{background:"transparent",border:"1px solid #333",borderRadius:8,color:C.offWhite,padding:"6px 12px",cursor:"pointer",fontSize:14}}>›</button>
          </div>

          {/* Legend */}
          <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap"}}>
            {[["#22C55E","✅ Available"],["#EF4444","🔴 Day Off (recurring)"],["#F59E0B","🟡 Unavailable (specific date)"],["#2A2A2A","⬜ Busy (has job)"]].map(function(l){return(
              <div key={l[1]} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted}}>
                <div style={{width:10,height:10,borderRadius:2,background:l[0],flexShrink:0}}/>
                {l[1]}
              </div>
            );})}
          </div>

          {/* Per-cleaner availability rows */}
          {(cleaners||[]).map(function(cl){
            var clAvail=availability[cl.id]||{};
            var recurringOff=clAvail.blockedDays||[];  // 0=Sun,1=Mon...6=Sat
            var specificOff=clAvail.blockedDates||[];      // "YYYY-MM-DD" strings

            // Build days in month
            var daysInMonth=new Date(availYear,availMonth+1,0).getDate();
            var firstDay=new Date(availYear,availMonth,1).getDay();

            return(
              <div key={cl.id} className="card" style={{marginBottom:10}}>
                {/* Cleaner name row */}
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#FFF",flexShrink:0,overflow:"hidden"}}>
                    {cl.photo?<img src={cl.photo} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:cl.avatar}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13}}>{cl.name}</div>
                    <div style={{fontSize:10,color:C.muted}}>{cl.role==="primary"?"⭐ Primary":"Backup"}</div>
                  </div>
                  {/* Quick unavailability summary */}
                  {recurringOff.length>0&&(
                    <div style={{fontSize:10,color:"#EF4444",fontWeight:600}}>
                      Off: {recurringOff.map(function(d){return["Su","Mo","Tu","We","Th","Fr","Sa"][d];}).join(", ")}
                    </div>
                  )}
                </div>

                {/* Day-of-week headers */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
                  {["S","M","T","W","T","F","S"].map(function(d,i){return(
                    <div key={i} style={{textAlign:"center",fontSize:9,color:"#555",fontWeight:700,padding:"2px 0"}}>{d}</div>
                  );})}
                </div>

                {/* Calendar grid */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                  {/* Empty cells for days before month start */}
                  {Array.from({length:firstDay}).map(function(_,i){
                    return <div key={"e"+i}/>;
                  })}
                  {/* Day cells */}
                  {Array.from({length:daysInMonth}).map(function(_,i){
                    var day=i+1;
                    var dateStr=availYear+"-"+String(availMonth+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
                    var dow=new Date(availYear,availMonth,day).getDay();
                    var isRecurringOff=recurringOff.indexOf(dow)>=0;
                    var isSpecificOff=specificOff.indexOf(dateStr)>=0;
                    var today=new Date();
                    var isToday=day===today.getDate()&&availMonth===today.getMonth()&&availYear===today.getFullYear();
                    // Check if cleaner has a job on this date
                    var hasJob=(jobs||[]).some(function(j){
                      return j.cleanerId===cl.id&&j.status!=="rejected"&&j.completedAt&&j.completedAt.startsWith(dateStr);
                    });

                    var bg="#1A1A1A";
                    var textColor=C.muted;
                    if(isSpecificOff){bg="rgba(245,158,11,.2)";textColor="#F59E0B";}
                    if(isRecurringOff){bg="rgba(239,68,68,.18)";textColor="#EF4444";}
                    if(hasJob&&!isRecurringOff&&!isSpecificOff){bg="rgba(42,42,42,1)";textColor="#555";}
                    if(!isRecurringOff&&!isSpecificOff&&!hasJob){bg="rgba(34,197,94,.1)";textColor="#22C55E";}

                    return(
                      <div key={day} style={{
                        textAlign:"center",padding:"4px 0",borderRadius:4,fontSize:11,fontWeight:isToday?900:600,
                        background:bg,color:textColor,
                        border:isToday?"1px solid #CC0000":"1px solid transparent",
                        cursor:"default"
                      }}>
                        {day}
                      </div>
                    );
                  })}
                </div>

                {/* Note from cleaner */}
                {clAvail.note&&(
                  <div style={{marginTop:8,fontSize:11,color:"#888",fontStyle:"italic",borderTop:"1px solid #2A2A2A",paddingTop:8}}>
                    📝 {clAvail.note}
                  </div>
                )}
              </div>
            );
          })}

          {(cleaners||[]).length===0&&(
            <div className="card" style={{textAlign:"center",padding:32,color:C.muted,fontSize:13}}>
              No cleaners on your team yet.
            </div>
          )}
        </div>
      )}
      {showAdd&&(
        <div className="modal-bg" onClick={()=>setShowAdd(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1,marginBottom:18}}>ADD CLEANER</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div><label>Full Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Jane Doe"/></div>
              <div><label>Email</label><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="jane@email.com"/></div>
              <div><label>Phone</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="555-0100"/></div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button className="btn ghost" style={{flex:1}} onClick={()=>setShowAdd(false)}>Cancel</button>
              <button className="btn" style={{flex:1}} onClick={add}>Add Cleaner</button>
            </div>
          </div>
        </div>
      )}
      {viewCleaner&&(
        <div className="modal-bg" onClick={()=>{setViewCleaner(null);setAssignMode(false);}}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <div className="avatar" style={{width:52,height:52,fontSize:18,overflow:"hidden"}}>{viewCleaner.photo?<img src={viewCleaner.photo} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:viewCleaner.avatar}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:16}}>{viewCleaner.name}</div>
                <div style={{fontSize:12,color:"#888"}}>{viewCleaner.email}</div>
              </div>
              <button onClick={()=>setViewCleaner(null)} style={{background:"none",border:"none",color:"#888",fontSize:20,cursor:"pointer"}}>×</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              {[["Jobs",viewCleaner.jobsCompleted||0],["Earned",fmt(viewCleaner.totalEarned||0)],["Rating","★ "+(viewCleaner.rating||5).toFixed(1)],["Reviews",(viewCleaner.reviews||[]).length]].map(pair=>(
                <div key={pair[0]} style={{background:"#141414",borderRadius:8,padding:12}}>
                  <div style={{fontSize:10,color:"#888",marginBottom:4}}>{pair[0]}</div>
                  <div style={{fontSize:16,fontWeight:700}}>{pair[1]}</div>
                </div>
              ))}
            </div>
            {/* Tabs */}
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {[["info","Info"],["ratings","Ratings"],["history","History"]].map(function(t){return(
                <button key={t[0]} onClick={function(){setCleanerTab(t[0]);}}
                  style={{flex:1,padding:"7px 4px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"Inter,sans-serif",
                    background:cleanerTab===t[0]?"#CC0000":"transparent",
                    borderColor:cleanerTab===t[0]?"#CC0000":"#333",
                    color:cleanerTab===t[0]?"#FFF":"#888"}}>
                  {t[1]}
                </button>
              );})}
            </div>

            {cleanerTab==="info"&&(
            <div style={{marginBottom:16,padding:"12px 14px",background:"#141414",borderRadius:10}}>
              <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Cleaner Role</div>
              <div style={{display:"flex",gap:8}}>
                {["primary","backup"].map(r=>{
                  var active=(viewCleaner.role||"backup")===r;
                  return(
                    <button key={r} onClick={()=>{setCleaners(cs=>cs.map(c=>c.id===viewCleaner.id?{...c,role:r}:c));setViewCleaner({...viewCleaner,role:r});}}
                      style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:.5,
                        background:active?(r==="primary"?"rgba(34,197,94,.15)":"rgba(245,158,11,.15)"):"transparent",
                        borderColor:active?(r==="primary"?"#22C55E":"#F59E0B"):"#333",
                        color:active?(r==="primary"?"#22C55E":"#F59E0B"):"#555"}}>
                      {r==="primary"?"⭐ PRIMARY":"🔄 BACKUP"}
                    </button>
                  );
                })}
              </div>
              <div style={{fontSize:10,color:"#555",marginTop:8}}>
                {(viewCleaner.role||"backup")==="primary"?"First to receive auto-assigned jobs. Must accept within 8 hours.":"Receives job if primary does not accept within 8 hours."}
              </div>
            </div>
            )}
            {cleanerTab==="ratings"&&(
              <div style={{marginBottom:16}}>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,marginBottom:4}}>RATINGS HISTORY</div>
                <div style={{fontSize:11,color:"#888",marginBottom:14}}>Manager ratings after each approved job</div>
                {/* Overall rating bar */}
                <div style={{background:"#141414",borderRadius:10,padding:14,marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:32,fontWeight:900,color:"#F59E0B"}}>{(viewCleaner.rating||5).toFixed(1)}</div>
                    <div>
                      <div style={{fontSize:18,marginBottom:2}}>{"⭐".repeat(Math.round(viewCleaner.rating||5))}</div>
                      <div style={{fontSize:11,color:"#888"}}>{(viewCleaner.reviews||[]).length} review{(viewCleaner.reviews||[]).length!==1?"s":""}</div>
                    </div>
                  </div>
                  {/* Star breakdown */}
                  {[5,4,3,2,1].map(function(star){
                    var count=(viewCleaner.reviews||[]).filter(function(r){return r.rating===star;}).length;
                    var pct=(viewCleaner.reviews||[]).length>0?Math.round((count/(viewCleaner.reviews||[]).length)*100):0;
                    return(
                      <div key={star} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{fontSize:11,color:"#888",width:8,textAlign:"right"}}>{star}</span>
                        <span style={{fontSize:10}}>⭐</span>
                        <div style={{flex:1,background:"#2A2A2A",borderRadius:4,height:6}}>
                          <div style={{background:"#F59E0B",height:6,borderRadius:4,width:pct+"%",transition:"width .3s"}}/>
                        </div>
                        <span style={{fontSize:10,color:"#888",width:28,textAlign:"right"}}>{count>0?count:""}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Individual reviews */}
                {(viewCleaner.reviews||[]).length===0&&(
                  <div style={{textAlign:"center",padding:24,color:"#555",background:"#141414",borderRadius:10}}>
                    <div style={{fontSize:24,marginBottom:8}}>⭐</div>
                    <div style={{fontSize:12}}>No ratings yet. Ratings appear after approving jobs.</div>
                  </div>
                )}
                {(viewCleaner.reviews||[]).slice().reverse().map(function(review,i){
                  return(
                    <div key={i} style={{background:"#141414",borderRadius:10,padding:14,marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div>
                          <div style={{fontSize:16,marginBottom:2}}>{"⭐".repeat(review.rating)}{"☆".repeat(5-review.rating)}</div>
                          <div style={{fontSize:11,fontWeight:700,color:"#FFF"}}>{review.property||"Property"}</div>
                        </div>
                        <div style={{fontSize:10,color:"#555",flexShrink:0}}>{review.date?new Date(review.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):""}</div>
                      </div>
                      {review.comment&&(
                        <div style={{fontSize:12,color:"#888",lineHeight:1.6,fontStyle:"italic",borderTop:"1px solid #2A2A2A",paddingTop:8,marginTop:4}}>"{review.comment}"</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {cleanerTab==="history"&&(
              <div style={{marginBottom:16}}>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,marginBottom:14}}>JOB HISTORY</div>
                {(viewCleaner.jobsCompleted||0)===0&&(
                  <div style={{textAlign:"center",padding:24,color:"#555",background:"#141414",borderRadius:10}}>
                    <div style={{fontSize:24,marginBottom:8}}>📋</div>
                    <div style={{fontSize:12}}>No completed jobs yet.</div>
                  </div>
                )}
                <div style={{background:"#141414",borderRadius:10,padding:14}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,color:"#CC0000"}}>{viewCleaner.jobsCompleted||0}</div>
                      <div style={{fontSize:9,color:"#888",textTransform:"uppercase",letterSpacing:.3}}>Jobs Done</div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,color:"#22C55E"}}>${viewCleaner.totalEarned||0}</div>
                      <div style={{fontSize:9,color:"#888",textTransform:"uppercase",letterSpacing:.3}}>Earned</div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,color:"#F59E0B"}}>★{(viewCleaner.rating||5).toFixed(1)}</div>
                      <div style={{fontSize:9,color:"#888",textTransform:"uppercase",letterSpacing:.3}}>Avg Rating</div>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:"#555",textAlign:"center",borderTop:"1px solid #2A2A2A",paddingTop:10}}>
                    Joined {viewCleaner.joinedAt?new Date(viewCleaner.joinedAt).toLocaleDateString("en-US",{month:"long",year:"numeric"}):"—"}
                  </div>
                </div>
              </div>
            )}
            {cleanerTab==="info"&&(
            <div>
            <div style={{marginBottom:14}}>
              {/* Stripe Connect Status */}
              <div style={{background:"#141414",borderRadius:10,padding:14,marginBottom:12,border:"1px solid "+(viewCleaner.stripeStatus==="connected"?"rgba(34,197,94,.3)":viewCleaner.stripeStatus==="pending"?"rgba(245,158,11,.3)":"rgba(239,68,68,.3)")}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:viewCleaner.stripeStatus==="connected"?0:10}}>
                  <div style={{width:32,height:32,borderRadius:8,background:"#635BFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>💳</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.3}}>STRIPE CONNECT</div>
                    <div style={{fontSize:11,color:viewCleaner.stripeStatus==="connected"?"#22C55E":viewCleaner.stripeStatus==="pending"?"#F59E0B":"#EF4444",fontWeight:700,marginTop:2}}>
                      {viewCleaner.stripeStatus==="connected"?"✓ Connected — Ready to receive payouts":viewCleaner.stripeStatus==="pending"?"⏳ Onboarding in progress":"✗ Not connected — cannot receive payments"}
                    </div>
                  </div>
                </div>
                {viewCleaner.stripeStatus!=="connected"&&(
                  <div>
                    <div style={{fontSize:11,color:"#888",lineHeight:1.6,marginBottom:10}}>
                      {viewCleaner.stripeStatus==="pending"
                        ?"The cleaner has started Stripe onboarding but hasn't completed it yet. They need to finish connecting their bank account."
                        :"This cleaner hasn't set up Stripe yet. They will need to connect their bank account before they can receive payouts."}
                    </div>
                    <button onClick={function(){
                      setCleaners(function(cs){return cs.map(function(c){
                        return c.id!==viewCleaner.id?c:Object.assign({},c,{stripeStatus:"pending"});
                      });});
                      setViewCleaner(Object.assign({},viewCleaner,{stripeStatus:"pending"}));
                    }} style={{width:"100%",background:"#635BFF",border:"none",borderRadius:8,color:"#FFF",fontSize:11,fontWeight:900,padding:"9px",cursor:"pointer",fontFamily:"Arial Black,sans-serif",letterSpacing:.5}}>
                      📧 SEND STRIPE INVITE
                    </button>
                    {viewCleaner.stripeStatus==="pending"&&(
                      <button onClick={function(){
                        setCleaners(function(cs){return cs.map(function(c){
                          return c.id!==viewCleaner.id?c:Object.assign({},c,{stripeStatus:"connected",stripeAccount:"acct_"+Date.now()});
                        });});
                        setViewCleaner(Object.assign({},viewCleaner,{stripeStatus:"connected",stripeAccount:"acct_"+Date.now()}));
                      }} style={{width:"100%",background:"transparent",border:"1px solid #22C55E",borderRadius:8,color:"#22C55E",fontSize:11,fontWeight:700,padding:"8px",cursor:"pointer",marginTop:6}}>
                        ✓ Mark as Connected (Demo)
                      </button>
                    )}
                  </div>
                )}
                {viewCleaner.stripeStatus==="connected"&&viewCleaner.stripeAccount&&(
                  <div style={{fontSize:10,color:"#555",marginTop:6}}>Account: {viewCleaner.stripeAccount}</div>
                )}
              </div>
            </div>
            {/* Availability summary */}
            {availability&&availability[viewCleaner.id]&&(availability[viewCleaner.id].blockedDays||[]).concat(availability[viewCleaner.id].blockedDates||[]).length>0&&(
              <div style={{background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,padding:"10px 12px",marginBottom:12}}>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,color:"#EF4444",letterSpacing:.3,marginBottom:6}}>📅 AVAILABILITY</div>
                {(availability[viewCleaner.id].blockedDays||[]).length>0&&(
                  <div style={{fontSize:11,color:"#AAA",marginBottom:3}}>
                    Off every: <span style={{color:"#FFF",fontWeight:600}}>{(availability[viewCleaner.id].blockedDays||[]).map(function(d){return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d];}).join(", ")}</span>
                  </div>
                )}
                {(availability[viewCleaner.id].blockedDates||[]).length>0&&(
                  <div style={{fontSize:11,color:"#AAA",marginBottom:3}}>{(availability[viewCleaner.id].blockedDates||[]).length} specific dates blocked</div>
                )}
                {availability[viewCleaner.id].note&&(
                  <div style={{fontSize:11,color:"#888",fontStyle:"italic",marginTop:4}}>" {availability[viewCleaner.id].note}"</div>
                )}
              </div>
            )}
            <div style={{borderTop:"1px solid #2A2A2A",paddingTop:14,marginBottom:14}}>
                <div style={{fontSize:11,color:"#CC0000",fontWeight:700,letterSpacing:.5,marginBottom:10}}>ASSIGN TO PROPERTY</div>
                <div style={{marginBottom:10}}><label>Property</label>
                  <select value={assignPropId} onChange={e=>setAssignPropId(e.target.value)}>
                    <option value="">-- Select Property --</option>
                    {(allProps||[]).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{marginBottom:10}}>
                    <label>Date</label>
                    <input type="date" value={assignDate} onChange={function(e){setAssignDate(e.target.value);setAssignSuccess(false);}}/>
                    {/* Blocked date warning */}
                    {assignDate&&viewCleaner&&(function(){
                      var avail=(availability&&availability[viewCleaner.id])||{};
                      var dow=new Date(assignDate+"T12:00:00").getDay();
                      var dayNames=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
                      var isRecurring=(avail.blockedDays||[]).includes(dow);
                      var isSpecific=(avail.blockedDates||[]).includes(assignDate);
                      if(!isRecurring&&!isSpecific)return null;
                      return(
                        <div style={{marginTop:5,background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:6,padding:"6px 10px",fontSize:11,color:"#EF4444",display:"flex",alignItems:"center",gap:6}}>
                          <span>🔴</span>
                          <span>{viewCleaner.name.split(" ")[0]}{isRecurring?" is off every "+dayNames[dow]:""}{isSpecific?(isRecurring?" and has":" has")+" blocked this date":""}</span>
                        </div>
                      );
                    })()}
                  </div>
                <div style={{marginBottom:14}}><label>Time</label><input type="time" value={assignTime} onChange={function(e){setAssignTime(e.target.value);}}/></div>
                <button id="tam-btn" onClick={function(){if(!assignPropId||!assignDate||!viewCleaner)return;var prop=(allProps||[]).find(function(p){return p.id===assignPropId;});if(!prop)return;var newSlot={id:'slot'+Date.now(),cleanerId:viewCleaner.id,date:assignDate,time:assignTime,status:'pending_acceptance',assignedAt:new Date().toISOString()};setProps(function(ps){return ps.map(function(pp){return pp.id!==assignPropId?pp:Object.assign({},pp,{schedule:(pp.schedule||[]).concat([newSlot])});});});var btn=document.getElementById('tam-btn');if(btn){btn.style.background='#22C55E';btn.textContent='✓ ASSIGNED!';}setTimeout(function(){setAssignMode(false);setAssignPropId('');setAssignDate('');setViewCleaner(null);},1800);}} style={{width:"100%",background:"#CC0000",border:"none",borderRadius:8,padding:"12px",color:"#FFF",fontSize:12,fontWeight:900,fontFamily:"Arial Black,sans-serif",cursor:"pointer"}}>Confirm Assignment</button>
              </div>
            </div>
            )}
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{setViewCleaner(null);setAssignMode(false);}} style={{background:"transparent",border:"1px solid #333",borderRadius:6,padding:"6px 10px",color:"#888",fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:.5}}>CLOSE</button>
              <button onClick={()=>setAssignMode(!assignMode)} style={{flex:2,background:"#CC0000",border:"none",borderRadius:6,padding:"6px 10px",color:"#FFF",fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:.5}}>+ ASSIGN JOB</button>
              <button onClick={()=>{setCleaners(cs=>cs.filter(c=>c.id!==viewCleaner.id));setViewCleaner(null);}} style={{background:"transparent",border:"1px solid #EF4444",borderRadius:6,padding:"6px 10px",color:"#EF4444",fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:.5}}>REMOVE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
function Cal({props,cleaners,myId,onSelectProp,user,setView,setProps,availability,setAvailability}){
  var today=new Date();
  const [month,setMonth]=useState(today.getMonth());
  const [year,setYear]=useState(today.getFullYear());
  const [sel,setSel]=useState(null);
  const [filterCleaner,setFilterCleaner]=useState("all");
  const [calView,setCalView]=useState("schedule");
  const [showAddJob,setShowAddJob]=useState(false);
  const [addJobPropId,setAddJobPropId]=useState("");
  const [addJobCleanerId,setAddJobCleanerId]=useState("");
  const [addJobTime,setAddJobTime]=useState("11:00");

  var isManager=!myId;
  var monthNames=["January","February","March","April","May","June","July","August","September","October","November","December"];
  var firstDay=new Date(year,month,1).getDay();
  var daysInMonth=new Date(year,month+1,0).getDate();
  var todayStr=today.getFullYear()+"-"+(String(today.getMonth()+1).padStart(2,"0"))+"-"+(String(today.getDate()).padStart(2,"0"));

  // Build job map: date -> [jobs]
  var jobMap={};
  props.forEach(function(p){
    (p.schedule||[]).forEach(function(slot){
      if(!slot.date)return;
      if(myId&&slot.cleanerId!==myId)return;
      if(filterCleaner!=="all"&&slot.cleanerId!==filterCleaner)return;
      if(!jobMap[slot.date])jobMap[slot.date]=[];
      var cl=cleaners.find(function(c){return c.id===slot.cleanerId;})||{name:"Unassigned"};
      jobMap[slot.date].push({prop:p,slot:slot,cleaner:cl});
    });
  });

  function goToday(){
    setMonth(today.getMonth());
    setYear(today.getFullYear());
    setSel(todayStr);
  }

  function prevMonth(){var m=month-1;if(m<0){setMonth(11);setYear(year-1);}else setMonth(m);}
  function nextMonth(){var m=month+1;if(m>11){setMonth(0);setYear(year+1);}else setMonth(m);}

  function dateStr(d){return year+"-"+(String(month+1).padStart(2,"0"))+"-"+(String(d).padStart(2,"0"));}

  function slotColor(slot){
    if(slot.status==="complete"||slot.status==="approved")return "#22C55E";
    if(slot.status==="pending_approval")return "#CC0000";
    if(slot.status==="pending_acceptance")return "#F59E0B";
    if(slot.status==="accepted")return "#3B82F6";
    if(slot.status==="declined")return "#EF4444";
    return "#888";
  }

  function slotLabel(slot){
    if(slot.status==="complete"||slot.status==="approved")return "✓ Done";
    if(slot.status==="pending_approval")return "⏳ Approval";
    if(slot.status==="pending_acceptance")return "📨 Awaiting";
    if(slot.status==="accepted")return "✅ Accepted";
    if(slot.status==="declined")return "❌ Declined";
    return "Scheduled";
  }

  function addJob(){
    if(!addJobPropId||!addJobCleanerId||!sel)return;
    var newSlot={id:"slot"+Date.now(),cleanerId:addJobCleanerId,date:sel,time:addJobTime,status:"pending_acceptance",assignedAt:new Date().toISOString()};
    setProps(function(ps){return ps.map(function(pp){
      if(pp.id!==addJobPropId)return pp;
      return Object.assign({},pp,{assignedTo:addJobCleanerId,schedule:(pp.schedule||[]).concat([newSlot])});
    });});
    setShowAddJob(false);setAddJobPropId("");setAddJobCleanerId("");setAddJobTime("11:00");
  }

  // Week strip - current week
  var weekStart=new Date(today);
  weekStart.setDate(today.getDate()-today.getDay());
  var weekDays=[];
  for(var wi=0;wi<7;wi++){
    var wd=new Date(weekStart);
    wd.setDate(weekStart.getDate()+wi);
    var wdStr=wd.getFullYear()+"-"+(String(wd.getMonth()+1).padStart(2,"0"))+"-"+(String(wd.getDate()).padStart(2,"0"));
    weekDays.push({date:wd,str:wdStr,jobs:jobMap[wdStr]||[]});
  }

  var selJobs=sel?jobMap[sel]||[]:[];

  return(
    <div style={{fontFamily:"Inter,sans-serif"}}>
      {/* Cleaner: Schedule / Availability tabs */}
      {user&&user.role==="cleaner"&&(
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {[["schedule","📅 Schedule"],["availability","🚫 My Availability"]].map(function(v){return(
            <button key={v[0]} onClick={function(){setCalView(v[0]);}}
              style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"Arial Black,sans-serif",
                background:calView===v[0]?"#CC0000":"transparent",
                borderColor:calView===v[0]?"#CC0000":"#333",
                color:calView===v[0]?"#FFF":C.muted}}>
              {v[1]}
            </button>
          );})}
        </div>
      )}
      {/* Availability tab content */}

      {user&&user.role==="cleaner"&&calView==="availability"&&(
        <CleanerAvailabilityEmbedded user={user} availability={availability} setAvailability={setAvailability}/>
      )}
      {/* Schedule tab content — always show for managers, conditionally for cleaners */}

      <div style={{display:(user&&user.role==="cleaner"&&calView!=="schedule")?"none":"block"}}>
      {/* Week strip */}
      <div style={{marginBottom:14,background:"#141414",borderRadius:12,padding:"10px 8px",border:"1px solid #2A2A2A"}}>
        <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,paddingLeft:4}}>This Week</div>
        <div style={{display:"flex",gap:4}}>
          {weekDays.map(function(wd){
            var isToday=wd.str===todayStr;
            var isSel=wd.str===sel;
            var hasjobs=wd.jobs.length>0;
            return(
              <div key={wd.str} onClick={function(){setSel(wd.str);setMonth(wd.date.getMonth());setYear(wd.date.getFullYear());}}
                style={{flex:1,textAlign:"center",cursor:"pointer",padding:"6px 2px",borderRadius:8,
                  background:isSel?"#CC0000":isToday?"rgba(204,0,0,.15)":"transparent",
                  border:isToday&&!isSel?"1px solid rgba(204,0,0,.3)":"1px solid transparent"}}>
                <div style={{fontSize:9,color:isSel?"#FFF":C.muted,marginBottom:3}}>
                  {["Su","Mo","Tu","We","Th","Fr","Sa"][wd.date.getDay()]}
                </div>
                <div style={{fontSize:13,fontWeight:700,color:isSel?"#FFF":isToday?"#CC0000":"#FFF"}}>
                  {wd.date.getDate()}
                </div>
                {hasjobs&&<div style={{width:5,height:5,borderRadius:"50%",background:isSel?"#FFF":"#CC0000",margin:"3px auto 0"}}/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <button onClick={prevMonth} style={{background:"none",border:"none",color:"#FFF",fontSize:20,cursor:"pointer",padding:"4px 8px"}}>{"<"}</button>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,letterSpacing:.5}}>{monthNames[month]} {year}</div>
        </div>
        <button onClick={nextMonth} style={{background:"none",border:"none",color:"#FFF",fontSize:20,cursor:"pointer",padding:"4px 8px"}}>{">"}</button>
      </div>

      {/* Today + Filter row */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
        <button onClick={goToday} style={{background:"transparent",border:"1px solid #CC0000",borderRadius:6,color:"#CC0000",fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>TODAY</button>
        {isManager&&(
          <select value={filterCleaner} onChange={function(e){setFilterCleaner(e.target.value);}}
            style={{flex:1,background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:6,color:"#FFF",fontSize:11,padding:"5px 8px",outline:"none"}}>
            <option value="all">All Cleaners</option>
            {cleaners.map(function(c){return <option key={c.id} value={c.id}>{c.name}</option>;})}
          </select>
        )}
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
        {[["#22C55E","Done"],["#3B82F6","Accepted"],["#F59E0B","Awaiting"],["#CC0000","Needs Approval"],["#EF4444","Declined"]].map(function(item){return(
          <div key={item[1]} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:item[0],flexShrink:0}}/>
            <span style={{fontSize:9,color:C.muted}}>{item[1]}</span>
          </div>
        );})}
      </div>

      {/* Calendar grid */}
      <div style={{background:"#141414",borderRadius:12,padding:10,marginBottom:14,border:"1px solid #2A2A2A"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:4}}>
          {["S","M","T","W","T","F","S"].map(function(d,i){return(
            <div key={i} style={{textAlign:"center",fontSize:10,color:C.muted,padding:"4px 0"}}>{d}</div>
          );})}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {Array(firstDay).fill(null).map(function(_,i){return <div key={"e"+i}/>;})}
          {Array(daysInMonth).fill(null).map(function(_,i){
            var d=i+1;
            var ds=dateStr(d);
            var dayJobs=jobMap[ds]||[];
            var isToday=ds===todayStr;
            var isSel=ds===sel;
            return(
              <div key={d} onClick={function(){setSel(isSel?null:ds);}}
                style={{minHeight:36,borderRadius:6,padding:"3px 2px",cursor:"pointer",textAlign:"center",
                  background:isSel?"#CC0000":isToday?"rgba(204,0,0,.15)":"transparent",
                  border:isToday&&!isSel?"1px solid rgba(204,0,0,.3)":"1px solid transparent"}}>
                <div style={{fontSize:12,fontWeight:isSel||isToday?700:400,color:isSel?"#FFF":isToday?"#CC0000":"#FFF",marginBottom:2}}>{d}</div>
                <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:1}}>
                  {dayJobs.slice(0,3).map(function(j,ji){return(
                    <div key={ji} style={{width:5,height:5,borderRadius:"50%",background:isSel?"rgba(255,255,255,.7)":slotColor(j.slot)}}/>
                  );})}
                  {dayJobs.length>3&&<div style={{fontSize:7,color:isSel?"#FFF":C.muted}}>+{dayJobs.length-3}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day jobs */}
      {sel&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5}}>
              {new Date(sel+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
            </div>
            {isManager&&(
              <button onClick={function(){setShowAddJob(true);}}
                style={{background:"#CC0000",border:"none",borderRadius:6,color:"#FFF",fontSize:10,fontWeight:900,padding:"5px 10px",cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>+ JOB</button>
            )}
          </div>

          {/* Add job form */}
          {showAddJob&&(
            <div className="card" style={{marginBottom:12,border:"1px solid rgba(204,0,0,.3)"}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,color:C.red,marginBottom:10}}>+ SCHEDULE JOB FOR {sel}</div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:.3}}>Property</div>
                <select value={addJobPropId} onChange={function(e){setAddJobPropId(e.target.value);}}
                  style={{width:"100%",background:"#1A1A1A",border:"1px solid #333",borderRadius:6,color:"#FFF",fontSize:12,padding:"7px 8px",outline:"none"}}>
                  <option value="">Select property...</option>
                  {props.map(function(p){return <option key={p.id} value={p.id}>{p.name}</option>;})}
                </select>
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:.3}}>Cleaner</div>
                <select value={addJobCleanerId} onChange={function(e){setAddJobCleanerId(e.target.value);}}
                  style={{width:"100%",background:"#1A1A1A",border:"1px solid #333",borderRadius:6,color:"#FFF",fontSize:12,padding:"7px 8px",outline:"none"}}>
                  <option value="">Select cleaner...</option>
                  {cleaners.map(function(c){return <option key={c.id} value={c.id}>{c.name}</option>;})}
                </select>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:.3}}>Start Time</div>
                <input type="time" value={addJobTime} onChange={function(e){setAddJobTime(e.target.value);}}
                  style={{width:"100%",background:"#1A1A1A",border:"1px solid #333",borderRadius:6,color:"#FFF",fontSize:12,padding:"7px 8px",outline:"none"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={addJob}
                  style={{flex:1,background:"#CC0000",border:"none",borderRadius:6,color:"#FFF",fontSize:11,fontWeight:900,padding:"9px",cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>SCHEDULE</button>
                <button onClick={function(e){e.stopPropagation();setShowAddJob(false);}}
                  style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:6,color:"#888",fontSize:11,padding:"9px",cursor:"pointer"}}>CANCEL</button>
              </div>
            </div>
          )}

          {selJobs.length===0&&!showAddJob&&(
            <div className="card" style={{textAlign:"center",padding:24,color:C.muted}}>
              <div style={{fontSize:24,marginBottom:8}}>📅</div>
              <div style={{fontSize:12}}>No jobs scheduled{isManager?" — tap + JOB to add one":""}</div>
            </div>
          )}

          {selJobs.map(function(item){
            var urgent=item.slot.status==="pending_acceptance"&&item.slot.assignedAt?
              Math.max(0,8-((Date.now()-new Date(item.slot.assignedAt).getTime())/3600000))<2:false;
            return(
              <div key={item.slot.id} className="card" style={{marginBottom:10,borderLeft:"3px solid "+slotColor(item.slot)}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{item.prop.name}</div>
                    <div style={{fontSize:11,color:C.muted}}>{isManager?item.cleaner.name:"You"} · {item.slot.time||"11:00"}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:slotColor(item.slot),background:"rgba(0,0,0,.3)",padding:"2px 8px",borderRadius:10,flexShrink:0}}>{slotLabel(item.slot)}</span>
                </div>
                {item.slot.status==="pending_acceptance"&&item.slot.assignedAt&&(
                  <div style={{fontSize:11,color:urgent?"#EF4444":"#F59E0B",marginBottom:8}}>
                    {urgent?"🚨":"⏳"} {Math.max(0,8-((Date.now()-new Date(item.slot.assignedAt).getTime())/3600000)).toFixed(1)}h to respond
                  </div>
                )}
                <div style={{display:"flex",gap:6}}>
                  {isManager?(
                    <button onClick={function(){onSelectProp&&onSelectProp(item.prop.id);}}
                      style={{flex:1,background:"transparent",border:"1px solid #CC0000",borderRadius:6,color:"#CC0000",fontSize:10,fontWeight:700,padding:"6px",cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>VIEW PROPERTY →</button>
                  ):(
                    item.slot.status==="pending_acceptance"?(
                      <div style={{display:"flex",gap:6,flex:1}}>
                        <button onClick={function(){
                          setProps(function(ps){return ps.map(function(pp){
                            if(pp.id!==item.prop.id)return pp;
                            return Object.assign({},pp,{schedule:(pp.schedule||[]).map(function(s){
                              return s.id!==item.slot.id?s:Object.assign({},s,{status:"accepted"});
                            })});
                          });});
                        }} style={{flex:1,background:"#22C55E",border:"none",borderRadius:6,color:"#FFF",fontSize:10,fontWeight:900,padding:"6px",cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>✓ ACCEPT</button>
                        <button onClick={function(){
                          setProps(function(ps){return ps.map(function(pp){
                            if(pp.id!==item.prop.id)return pp;
                            return Object.assign({},pp,{schedule:(pp.schedule||[]).map(function(s){
                              return s.id!==item.slot.id?s:Object.assign({},s,{status:"declined"});
                            })});
                          });});
                        }} style={{flex:1,background:"transparent",border:"1px solid #EF4444",borderRadius:6,color:"#EF4444",fontSize:10,fontWeight:900,padding:"6px",cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>✗ DECLINE</button>
                      </div>
                    ):(
                      <button onClick={function(){setView&&setView("My Jobs");}}
                        style={{flex:1,background:"transparent",border:"1px solid #CC0000",borderRadius:6,color:"#CC0000",fontSize:10,fontWeight:700,padding:"6px",cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>OPEN JOB →</button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}


function Approvals({jobs,setJobs,props,setProps,cleaners,setCleaners,setView,setNotifications,user,setShowMgrStripe,pendingRemovals,setPendingRemovals}){
  var pend=jobs.filter(function(j){return j.status==="pending_approval";});
  var rejected=jobs.filter(function(j){return j.status==="needs_resubmit";});
  // Use pendingRemovals from App state
  var removalRequests=(pendingRemovals||[]).map(function(r){
    var prop=(props||[]).find(function(p){return p.id===r.propId;})||{name:r.propName,id:r.propId};
    var cl=(cleaners||[]).find(function(c){return c.id===r.cleanerId;})||{name:r.cleanerName||"Cleaner",avatar:"?"};
    return {removal:r,prop:prop,cleaner:cl};
  });
  // Pending acceptance - slots sent to cleaners not yet responded
  var pendingAcc=[];
  (props||[]).forEach(function(p){
    (p.schedule||[]).forEach(function(slot){
      if(slot.status==="pending_acceptance"&&slot.cleanerId){
        var cl=cleaners.find(function(c){return c.id===slot.cleanerId;})||{name:"Unknown"};
        var hoursLeft=slot.assignedAt?Math.max(0,8-((Date.now()-new Date(slot.assignedAt).getTime())/3600000)):8;
        pendingAcc.push({prop:p,slot:slot,cleaner:cl,hoursLeft:hoursLeft});
      }
    });
  });
  // no sort - preserve stable prop/slot order
  const [reviewJob,setReviewJob]=useState(null);
  const [tipAmount,setTipAmount]=useState(0);
  const [customTip,setCustomTip]=useState("");
  const [showCustomTip,setShowCustomTip]=useState(false);
  const [ratingJob,setRatingJob]=useState(null);
  const [managerRating,setManagerRating]=useState(0);
  const [managerComment,setManagerComment]=useState("");
  const [guestLinkCopied,setGuestLinkCopied]=useState(false);
  const [rejectJob,setRejectJob]=useState(null);
  const [rejectReason,setRejectReason]=useState("");
  const [rejectCustom,setRejectCustom]=useState("");
  const [reassignSlot,setReassignSlot]=useState(null);
  const [reassignCid,setReassignCid]=useState("");
  const [resentSlotId,setResentSlotId]=useState(null);
  const [removeJobConfirm,setRemoveJobConfirm]=useState(null);

  function approve(jobId){
    var job=jobs.find(function(j){return j.id===jobId;});
    if(!job)return;
    // Block if manager Stripe not connected
    if(!user||(!user.stripeBusinessStatus||user.stripeBusinessStatus==="not_connected")){
      setShowMgrStripe(true);
      return;
    }
    var cleaner=cleaners.find(function(c){return c.id===job.cleanerId;})||{};
    var payoutStatus=cleaner.stripeStatus==="connected"?"paid":"pending_stripe";
    setJobs(function(js){return js.map(function(j){return j.id===jobId?Object.assign({},j,{status:"approved",paidAt:new Date().toISOString(),payoutStatus:payoutStatus,stripeAccount:cleaner.stripeAccount||null}):j;});});
    // Reset property tasks, inventory, room videos for next clean
    setProps(function(ps){return ps.map(function(pp){
      if(pp.id!==job.propertyId&&pp.name!==job.propertyName)return pp;
      return Object.assign({},pp,{
        // Reset tasks to unchecked
        tasks:(pp.tasks||[]).map(function(t){return Object.assign({},t,{done:false});}),
        // Clear cleaner inventory statuses
        inventory:(pp.inventory||[]).map(function(i){return Object.assign({},i,{cleanerStatus:null});}),
        // Clear room videos and pre-clean videos (keep ref photos/ref videos)
        rooms:(pp.rooms||[]).map(function(r){return Object.assign({},r,{video:null,preVideo:null});}),
        // Clear cleaner notes
        cleanerNotes:"",
        cleanerPhotos:[],
      });
    });});
    // Pay primary cleaner their amount (full pay if solo, split if duo)
    var cleaner1Pay=job.pay1||job.pay;
    var cleaner2Pay=job.pay2||0;
    setCleaners(function(cs){return cs.map(function(c){
      if(c.id===job.cleanerId)return Object.assign({},c,{totalEarned:c.totalEarned+cleaner1Pay,jobsCompleted:c.jobsCompleted+1});
      if(job.cleanerId2&&c.id===job.cleanerId2)return Object.assign({},c,{totalEarned:c.totalEarned+cleaner2Pay,jobsCompleted:c.jobsCompleted+1});
      return c;
    });});
    setReviewJob(null);
    setRatingJob(job);
    setManagerRating(0);
    setManagerComment("");
    // Persist to Supabase if real job
    if(job.dbId||(job.id&&job.id.includes("-"))){
      var realJobId=job.dbId||job.id;
      updateJob(realJobId,{status:"approved",paid_at:new Date().toISOString()}).catch(function(e){console.error("Approve save failed:",e.message);});
    }
    // Also update cleaner stats in Supabase
    if(job.cleanerId&&job.cleanerId.length>20){
      var cl=cleaners.find(function(c){return c.id===job.cleanerId;})||{};
      updateUserProfile(job.cleanerId,{total_earned:(cl.totalEarned||0)+cleaner1Pay,jobs_completed:(cl.jobsCompleted||0)+1}).catch(function(e){console.error("Cleaner stats save:",e.message);});
    }
  }

  function submitRating(){
    if(!ratingJob)return;
    if(managerRating>0){
      setCleaners(function(cs){return cs.map(function(c){
        if(c.id!==ratingJob.cleanerId)return c;
        var reviews=c.reviews||[];
        var newReview={rating:managerRating,comment:managerComment,date:new Date().toISOString(),property:ratingJob.propertyName};
        var allRatings=reviews.map(function(r){return r.rating;}).concat([managerRating]);
        var avgRating=allRatings.reduce(function(a,b){return a+b;},0)/allRatings.length;
        return Object.assign({},c,{reviews:reviews.concat([newReview]),rating:Math.round(avgRating*10)/10});
      });});
    }
    setRatingJob(null);
    setManagerRating(0);
    setManagerComment("");
  }

  function reject(jobId,reason){
    var job=jobs.find(function(j){return j.id===jobId;});
    setJobs(function(js){return js.map(function(j){
      return j.id===jobId?Object.assign({},j,{status:"needs_resubmit",rejectedAt:new Date().toISOString(),rejectReason:reason}):j;
    });});
    // Persist to Supabase if real job
    if(job&&(job.dbId||(job.id&&job.id.length>10&&job.id[0]!=="j"))){
      var realJobId=job.dbId||job.id;
      updateJob(realJobId,{status:"needs_resubmit",rejection_reason:reason}).catch(function(e){console.error("Reject save failed:",e.message);});
    }
    // Notify the cleaner
    var job=jobs.find(function(j){return j.id===jobId;});
    if(job){
      setNotifications(function(prev){return [{
        id:"notif"+Date.now(),type:"rejected",icon:"❌",
        title:"Job Submission Rejected",
        body:(job.propertyName||"Your job")+" was rejected. Reason: "+reason+". Please fix and resubmit.",
        forRole:"cleaner",forCleaner:job.cleanerId,
        navTo:"My Jobs",time:new Date().toISOString(),read:false
      }].concat(prev).slice(0,50);});
    }
  }

  return(
    <div>
      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1,marginBottom:4}}>APPROVALS</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:16}}>
        {pend.length} job{pend.length!==1?"s":""} awaiting review
        {removalRequests.length>0&&<span style={{color:"#F59E0B",fontWeight:700,marginLeft:8}}>· {removalRequests.length} removal request{removalRequests.length!==1?"s":""}</span>}

      </div>

      {pend.length===0&&pendingAcc.length===0&&rejected.length===0&&removalRequests.length===0&&(
        <div className="card" style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:40,marginBottom:12}}>✅</div>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,marginBottom:6}}>ALL CLEAR</div>
          <div style={{fontSize:12,color:C.muted}}>No jobs pending approval or awaiting response</div>
        </div>
      )}

      {/* Removal Requests section */}
      {removalRequests.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,letterSpacing:.5,color:"#F59E0B",marginBottom:8}}>
            ⚠️ REMOVAL REQUESTS ({removalRequests.length})
          </div>
          {removalRequests.map(function(item){return(
            <div key={item.removal.id} className="card" style={{marginBottom:8,border:"1px solid rgba(245,158,11,.4)",background:"rgba(245,158,11,.04)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:"#EF4444",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#FFF",flexShrink:0,overflow:"hidden"}}>
                  {item.cleaner.photo?<img src={item.cleaner.photo} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:item.cleaner.avatar||"?"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13}}>{item.cleaner.name}</div>
                  <div style={{fontSize:11,color:"#888"}}>{item.prop.name} · {item.removal.slotDate} at {item.removal.slotTime||"11:00"}</div>
                </div>
                <div style={{fontSize:10,color:"#F59E0B",fontWeight:700,flexShrink:0}}>⚠️ REQ REMOVAL</div>
              </div>
              {item.removal.reason&&(
                <div style={{background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.25)",borderRadius:6,padding:"7px 10px",fontSize:11,color:"#F59E0B",lineHeight:1.5,marginBottom:10}}>
                  <strong>Reason:</strong> {item.removal.reason}
                </div>
              )}
              <div style={{display:"flex",gap:6}}>
                <button onClick={function(e){e.stopPropagation();
                  // Remove from schedule
                  setProps(function(ps){return ps.map(function(pp){
                    if(pp.id!==item.prop.id)return pp;
                    return Object.assign({},pp,{schedule:(pp.schedule||[]).filter(function(s){return s.id!==item.removal.slotId;})});
                  });});
                  // Remove from pendingRemovals
                  setPendingRemovals(function(prev){return prev.filter(function(r){return r.id!==item.removal.id;});});
                  // Notify cleaner
                  setNotifications(function(prev){return [{
                    id:"notif"+Date.now(),type:"info",icon:"✅",
                    title:"Removal Approved",
                    body:"Your request to be removed from "+item.prop.name+" on "+item.removal.slotDate+" has been approved.",
                    forRole:"cleaner",forCleaner:item.removal.cleanerId,
                    navTo:"My Jobs",time:new Date().toISOString(),read:false
                  }].concat(prev).slice(0,50);});
                }} style={{flex:1,background:"#22C55E",border:"none",borderRadius:6,padding:"8px",color:"#FFF",fontSize:10,fontWeight:900,fontFamily:"Arial Black,sans-serif",cursor:"pointer",letterSpacing:.3}}>
                  ✓ APPROVE REMOVAL
                </button>
                <button onClick={function(e){e.stopPropagation();
                  // Remove from pendingRemovals (deny = dismiss the request, keep the slot)
                  setPendingRemovals(function(prev){return prev.filter(function(r){return r.id!==item.removal.id;});});
                  // Notify cleaner
                  setNotifications(function(prev){return [{
                    id:"notif"+Date.now(),type:"info",icon:"❌",
                    title:"Removal Request Denied",
                    body:"Your request to be removed from "+item.prop.name+" on "+item.removal.slotDate+" was not approved. Please report to the property as scheduled.",
                    forRole:"cleaner",forCleaner:item.removal.cleanerId,
                    navTo:"My Jobs",time:new Date().toISOString(),read:false
                  }].concat(prev).slice(0,50);});
                }} style={{flex:1,background:"transparent",border:"1px solid #EF4444",borderRadius:6,padding:"8px",color:"#EF4444",fontSize:10,fontWeight:900,fontFamily:"Arial Black,sans-serif",cursor:"pointer",letterSpacing:.3}}>
                  ✕ DENY
                </button>
                <button onClick={function(e){e.stopPropagation();
                  // Build a slot-like object for the reassign modal
                  var slotObj={id:item.removal.slotId,date:item.removal.slotDate,time:item.removal.slotTime,cleanerId:item.removal.cleanerId,status:"accepted"};
                  setReassignSlot({prop:item.prop,slot:slotObj});
                  setPendingRemovals(function(prev){return prev.filter(function(r){return r.id!==item.removal.id;});});
                }}
                  style={{flex:1,background:"transparent",border:"1px solid #CC0000",borderRadius:6,padding:"8px",color:"#CC0000",fontSize:10,fontWeight:900,fontFamily:"Arial Black,sans-serif",cursor:"pointer",letterSpacing:.3}}>
                  👤 REASSIGN
                </button>
              </div>
            </div>
          );})}
        </div>
      )}

      {/* Needs Resubmit section */}
      {rejected.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,letterSpacing:.5,color:"#EF4444",marginBottom:8}}>🔄 NEEDS RESUBMIT ({rejected.length})</div>
          {rejected.map(function(job){
            var cl=(cleaners||[]).find(function(c){return c.id===job.cleanerId;})||{name:"Cleaner",avatar:"?"};
            return(
              <div key={job.id} className="card" style={{marginBottom:8,border:"1px solid rgba(239,68,68,.3)"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:"#EF4444",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#FFF",flexShrink:0,overflow:"hidden"}}>
                    {cl.photo?<img src={cl.photo} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:cl.avatar}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.propertyName}</div>
                    <div style={{fontSize:11,color:"#888"}}>{cl.name} · Rejected {job.rejectedAt?new Date(job.rejectedAt).toLocaleDateString("en-US",{month:"short",day:"numeric"}):""}</div>
                  </div>
                </div>
                {job.rejectReason&&(
                  <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:6,padding:"8px 10px",fontSize:11,color:"#EF4444",lineHeight:1.5}}>
                    <strong>Reason sent to cleaner:</strong> {job.rejectReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Acceptance - jobs awaiting cleaner response */}
      {pendingAcc.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,color:"#F59E0B",marginBottom:10}}>⏳ AWAITING CLEANER RESPONSE ({pendingAcc.length})</div>
          {pendingAcc.map(function(item){
            var urgent=item.hoursLeft<2;
            return(
              <div key={item.slot.id} className="card" style={{marginBottom:10,border:"1px solid "+(urgent?"rgba(239,68,68,.3)":"rgba(245,158,11,.3)"),cursor:"pointer"}}
                onClick={function(){setView("Properties");}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{item.prop.name}</div>
                    <div style={{fontSize:11,color:C.muted}}>{item.cleaner.name}</div>
                    <div style={{fontSize:11,color:C.muted}}>{item.slot.date} at {item.slot.time||"11:00"}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:12,fontWeight:900,color:urgent?"#EF4444":"#F59E0B"}}>{urgent?"🚨":"⏳"} {item.hoursLeft.toFixed(1)}h</div>
                    <div style={{fontSize:9,color:C.muted,marginTop:2}}>{urgent?"EXPIRES SOON":"WAITING"}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={function(e){e.stopPropagation();
                    // Cancel this slot
                    setProps(function(ps){return ps.map(function(pp){
                      if(pp.id!==item.prop.id)return pp;
                      return Object.assign({},pp,{schedule:(pp.schedule||[]).filter(function(s){return s.id!==item.slot.id;})});
                    });});
                  }} style={{flex:1,background:"transparent",border:"1px solid #555",borderRadius:6,padding:"7px",color:"#888",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>CANCEL</button>
                  <button onClick={function(e){
                    e.stopPropagation();
                    var slotId=item.slot.id;
                    setProps(function(ps){return ps.map(function(pp){
                      if(pp.id!==item.prop.id)return pp;
                      return Object.assign({},pp,{schedule:(pp.schedule||[]).map(function(s){
                        return s.id!==slotId?s:Object.assign({},s,{assignedAt:new Date().toISOString()});
                      })});
                    });});
                    setNotifications(function(prev){return [{
                      id:"notif"+Date.now(),type:"assigned",icon:"📋",
                      title:"Job Reminder — Action Required",
                      body:"Reminder: You have a job at "+(item.prop.name||"a property")+" on "+item.slot.date+". Please accept or decline within 8 hours.",
                      forRole:"cleaner",forCleaner:item.slot.cleanerId,
                      navTo:"My Jobs",time:new Date().toISOString(),read:false
                    }].concat(prev).slice(0,50);});
                    setResentSlotId(slotId);
                    setTimeout(function(){setResentSlotId(null);},2000);
                  }} style={{flex:1,background:resentSlotId===item.slot.id?"#22C55E":"#F59E0B",border:"none",borderRadius:6,padding:"7px",color:resentSlotId===item.slot.id?"#FFF":"#000",fontSize:10,fontWeight:900,cursor:"pointer",fontFamily:"Arial Black,sans-serif",transition:"background .2s"}}>
                    {resentSlotId===item.slot.id?"✓ SENT!":"🔄 RESEND"}
                  </button>
                  <button onClick={function(e){e.stopPropagation();
                  // Build a slot-like object for the reassign modal
                  var slotObj={id:item.removal.slotId,date:item.removal.slotDate,time:item.removal.slotTime,cleanerId:item.removal.cleanerId,status:"accepted"};
                  setReassignSlot({prop:item.prop,slot:slotObj});
                  setPendingRemovals(function(prev){return prev.filter(function(r){return r.id!==item.removal.id;});});
                }}
                    style={{flex:1,background:"transparent",border:"1px solid #CC0000",borderRadius:6,padding:"7px",color:"#CC0000",fontSize:10,fontWeight:900,cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>👤 REASSIGN</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pend.map(function(job){
        var cl=cleaners.find(function(c){return c.id===job.cleanerId;});
        return(
          <div key={job.id} className="card" style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,letterSpacing:.3,marginBottom:3}}>{job.propertyName}</div>
                <div style={{fontSize:12,color:C.muted}}>{cl?cl.name:"Unknown"} · {job.completedAt?new Date(job.completedAt).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"—"}</div>
              </div>
              <span style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,color:"#22C55E"}}>{fmt(job.pay)}</span>
            </div>
            <div>
              <div style={{display:"flex",gap:5,marginBottom:5}}>
                <button onClick={function(){setRejectJob(job);setRejectReason("");setRejectCustom("");}} style={{flex:1,background:"transparent",border:"1px solid #EF4444",borderRadius:6,padding:"7px 6px",color:"#EF4444",fontSize:10,fontWeight:900,cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>REJECT</button>
                <button onClick={function(){
                  setRemoveJobConfirm(job); return;
                // Remove cleaner from the slot on the property schedule
                setProps(function(ps){return ps.map(function(pp){
                  if(pp.id!==job.propertyId&&pp.name!==job.propertyName)return pp;
                  return Object.assign({},pp,{schedule:(pp.schedule||[]).map(function(s){
                    if(s.cleanerId!==job.cleanerId||s.date!==job.date)return s;
                    return Object.assign({},s,{cleanerId:null,status:"open",assignedAt:null});
                  })});
                });});
                // Mark job as cancelled
                setJobs(function(js){return js.filter(function(j){return j.id!==job.id;});});
                // Notify cleaner
                setNotifications(function(prev){return [{
                  id:"notif"+Date.now(),type:"info",icon:"ℹ️",
                  title:"Job Assignment Removed",
                  body:"Harvey has removed you from the job at "+job.propertyName+(job.date?" on "+job.date:"")+". Please contact Harvey if you have questions.",
                  forRole:"cleaner",forCleaner:job.cleanerId,
                  navTo:"My Jobs",time:new Date().toISOString(),read:false
                }].concat(prev).slice(0,50);});
              }} style={{flex:1,background:"transparent",border:"1px solid #888",borderRadius:6,padding:"7px 6px",color:"#888",fontSize:10,fontWeight:900,cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>✕ REMOVE</button>
                <button onClick={function(){setReviewJob(job);}} style={{flex:1,background:"transparent",border:"1px solid #555",borderRadius:6,padding:"7px 6px",color:"#AAA",fontSize:10,fontWeight:900,cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>REVIEW</button>
              </div>
              <button onClick={function(){approve(job.id);}} style={{width:"100%",background:"#CC0000",border:"none",borderRadius:6,padding:"10px",color:"#FFF",fontSize:12,fontWeight:900,cursor:"pointer",fontFamily:"Arial Black,sans-serif",letterSpacing:.3}}>✓ APPROVE &amp; PAY {fmt(job.pay)}</button>
            </div>
          </div>
        );
      })}

      {/* Review Modal */}
      {reviewJob&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:300,overflowY:"auto"}} onClick={function(){setReviewJob(null);}}>
          <div style={{background:"#141414",borderRadius:14,margin:"20px auto",maxWidth:480,padding:20,fontFamily:"Inter,sans-serif"}} onClick={function(e){e.stopPropagation();}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,letterSpacing:1}}>JOB REVIEW</div>
              <button onClick={function(){setReviewJob(null);}} style={{background:"none",border:"none",color:"#888",fontSize:22,cursor:"pointer"}}>×</button>
            </div>
            <div style={{background:"#1A1A1A",borderRadius:10,padding:14,marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{reviewJob.propertyName}</div>
              <div style={{fontSize:12,color:"#888",marginBottom:2}}>
                {(cleaners.find(function(c){return c.id===reviewJob.cleanerId;})||{}).name||"Unknown cleaner"}
                {reviewJob.twoCleaners&&reviewJob.cleanerId2&&(
                  <span style={{color:"#3B82F6"}}> + {(cleaners.find(function(c){return c.id===reviewJob.cleanerId2;})||{}).name||"Cleaner 2"}</span>
                )}
                {reviewJob.twoCleaners&&<span style={{fontSize:10,background:"rgba(59,130,246,.15)",color:"#3B82F6",borderRadius:10,padding:"1px 6px",marginLeft:6,fontWeight:700}}>👥 2-cleaner job</span>}
              </div>
              {reviewJob.twoCleaners&&(
                <div style={{display:"flex",gap:8,marginTop:6}}>
                  <div style={{flex:1,background:"rgba(34,197,94,.08)",borderRadius:6,padding:"6px 10px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:"#888"}}>{(cleaners.find(function(c){return c.id===reviewJob.cleanerId;})||{}).name||"C1"}</div>
                    <div style={{fontWeight:700,color:"#22C55E"}}>${(reviewJob.pay1||0).toFixed(0)}</div>
                  </div>
                  {reviewJob.cleanerId2&&<div style={{flex:1,background:"rgba(34,197,94,.08)",borderRadius:6,padding:"6px 10px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:"#888"}}>{(cleaners.find(function(c){return c.id===reviewJob.cleanerId2;})||{}).name||"C2"}</div>
                    <div style={{fontWeight:700,color:"#22C55E"}}>${(reviewJob.pay2||0).toFixed(0)}</div>
                  </div>}
                </div>
              )}
              <div style={{fontSize:12,color:"#888",marginBottom:reviewJob.durationStr?4:0}}>Completed: {new Date(reviewJob.completedAt).toLocaleString()}</div>
              {reviewJob.durationStr&&(
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6,background:"rgba(34,197,94,.08)",borderRadius:6,padding:"5px 10px",width:"fit-content"}}>
                  <span style={{fontSize:14}}>⏱</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#22C55E"}}>Job took {reviewJob.durationStr}</span>
                </div>
              )}
            </div>
            <div style={{background:"#1A1A1A",borderRadius:10,padding:14,marginBottom:14}}>
              <div style={{fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Payout Breakdown</div>
              {(function(){
                var prop2=(props||[]).find(function(p){return p.id===reviewJob.propertyId||p.name===reviewJob.propertyName;})||{};
                var linenBags=prop2.linenBags||0;
                var linenRate=prop2.linenRate||10;
                var linenExtra=linenBags*linenRate;
                return(
                  <div>
                    {/* Base pay row */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,paddingBottom:8,borderBottom:"1px solid #2A2A2A"}}>
                      <span style={{fontSize:12,color:"#AAA"}}>Base Pay</span>
                      <span style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,color:C.red}}>{fmt(reviewJob.pay)}</span>
                    </div>
                    {/* Linen bags */}
                    {linenBags>0&&(
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,paddingBottom:8,borderBottom:"1px solid #2A2A2A"}}>
                        <div>
                          <div style={{fontSize:12,color:"#AAA"}}>🛍️ Linen Bags ({linenBags} × ${linenRate})</div>
                          {(prop2.linenBagPhotos||[]).length>0&&(
                            <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
                              {(prop2.linenBagPhotos||[]).map(function(ph,i){
                                var isVid=ph.startsWith("data:video");
                                function openFull2(){
                                  var ov=document.createElement("div");
                                  ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.96);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:16px;";
                                  ov.onclick=function(e){if(e.target===ov)document.body.removeChild(ov);};
                                  if(isVid){var vid=document.createElement("video");vid.src=ph;vid.controls=true;vid.autoplay=true;vid.playsInline=true;vid.style.cssText="max-width:95vw;max-height:80vh;border-radius:8px;";ov.appendChild(vid);}
                                  else{var img=document.createElement("img");img.src=ph;img.style.cssText="max-width:95vw;max-height:80vh;object-fit:contain;border-radius:8px;";ov.appendChild(img);}
                                  var cl=document.createElement("button");cl.textContent="✕ Close";
                                  cl.style.cssText="margin-top:12px;background:rgba(255,255,255,.2);border:none;color:#FFF;font-size:14px;padding:10px 24px;border-radius:20px;cursor:pointer;";
                                  cl.onclick=function(){document.body.removeChild(ov);};
                                  ov.appendChild(cl);document.body.appendChild(ov);
                                }
                                return(
                                  <div key={i} style={{position:"relative",cursor:"pointer"}} onClick={openFull2}>
                                    {isVid?(
                                      <div style={{width:54,height:54,borderRadius:6,overflow:"hidden",position:"relative"}}>
                                        <video src={ph} style={{width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}}/>
                                        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.3)"}}>
                                          <span style={{fontSize:14,color:"#FFF"}}>▶</span>
                                        </div>
                                      </div>
                                    ):(
                                      <img src={ph} style={{width:54,height:54,borderRadius:6,objectFit:"cover",pointerEvents:"none"}}/>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <span style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,color:"#3B82F6"}}>${linenExtra.toFixed(2)}</span>
                      </div>
                    )}
                    {/* Total */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(34,197,94,.08)",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                      <span style={{fontSize:13,fontWeight:700,color:"#FFF"}}>Total Payout</span>
                      <span style={{fontFamily:"Arial Black,sans-serif",fontSize:22,fontWeight:900,color:"#22C55E"}}>${(reviewJob.pay+linenExtra).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            {reviewJob.tasks&&reviewJob.tasks.length>0&&(
              <div style={{background:"#1A1A1A",borderRadius:10,padding:14,marginBottom:14}}>
                <div style={{fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>
                  Tasks — {reviewJob.tasks.filter(function(t){return t.done;}).length}/{reviewJob.tasks.length} completed
                </div>
                {reviewJob.tasks.map(function(t){return(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #222"}}>
                    <div style={{width:18,height:18,borderRadius:4,flexShrink:0,background:t.done?"#22C55E":"transparent",border:"2px solid "+(t.done?"#22C55E":"#444"),display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {t.done&&<span style={{color:"#FFF",fontSize:10,fontWeight:900}}>✓</span>}
                    </div>
                    <span style={{fontSize:12,color:t.done?"#FFF":"#666",flex:1,wordBreak:"break-word",overflowWrap:"break-word",minWidth:0}}>{t.label}</span>
                  </div>
                );})}
              </div>
            )}
            {reviewJob.uploads&&reviewJob.uploads.length>0&&(
              <div style={{background:"#1A1A1A",borderRadius:10,padding:14,marginBottom:14}}>
                <div style={{fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Photos & Videos — tap to view full screen</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {reviewJob.uploads.map(function(u,i){
                    var src=u.url||u;
                    var isVideo=u.type==="video"||(typeof src==="string"&&src.startsWith("data:video"));
                    function openFull(){
                      var overlay=document.createElement("div");
                      overlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.96);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;";
                      overlay.onclick=function(e){if(e.target===overlay)document.body.removeChild(overlay);};
                      if(isVideo){
                        var vid=document.createElement("video");
                        vid.src=src;vid.controls=true;vid.autoplay=true;
                        vid.style.cssText="max-width:95vw;max-height:85vh;border-radius:8px;";
                        overlay.appendChild(vid);
                      } else {
                        var img=document.createElement("img");
                        img.src=src;
                        img.style.cssText="max-width:95vw;max-height:85vh;object-fit:contain;border-radius:8px;";
                        overlay.appendChild(img);
                      }
                      var close=document.createElement("button");
                      close.textContent="✕ Close";
                      close.style.cssText="margin-top:16px;background:rgba(255,255,255,.15);border:none;color:#FFF;font-size:14px;padding:8px 20px;border-radius:20px;cursor:pointer;";
                      close.onclick=function(){document.body.removeChild(overlay);};
                      overlay.appendChild(close);
                      document.body.appendChild(overlay);
                    }
                    return(
                    <div key={i} style={{position:"relative",display:"inline-block",cursor:"pointer"}} onClick={openFull}>
                      {isVideo?(
                        <div style={{width:90,height:90,borderRadius:8,background:"#000",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
                          <video src={src} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:8}}/>
                          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.3)"}}>
                            <span style={{fontSize:24}}>▶</span>
                          </div>
                        </div>
                      ):(
                        <img src={src} alt={"upload "+(i+1)} style={{width:90,height:90,borderRadius:8,objectFit:"cover",display:"block"}}/>
                      )}
                      <button onClick={function(e){e.stopPropagation();downloadMedia(src,(u.name||"file-"+i)+(isVideo?".mp4":".jpg"));}}
                        style={{position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,.8)",border:"none",borderRadius:4,color:"#22C55E",fontSize:9,padding:"2px 5px",cursor:"pointer",fontWeight:700}}>⬇️</button>
                    </div>
                  );})}
                </div>
              </div>
            )}
            {/* Before vs After Room Comparison */}
            {(function(){
              var prop=(props||[]).find(function(p){return p.id===reviewJob.propertyId||p.name===reviewJob.propertyName;});
              if(!prop)return null;
              var roomsWithBoth=(prop.rooms||[]).filter(function(r){return r.video&&((r.refPhotos&&r.refPhotos.length>0)||r.refVideo);});
              if(!roomsWithBoth.length)return null;
              return(
                <div style={{background:"#1A1A1A",borderRadius:10,padding:14,marginBottom:14}}>
                  <div style={{fontSize:11,color:"#3B82F6",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:12}}>📸 Before vs After — Room Comparison</div>
                  {roomsWithBoth.map(function(r){return(
                    <div key={r.id} style={{marginBottom:14}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#FFF",marginBottom:6}}>{r.icon} {r.name}</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <div>
                          <div style={{fontSize:9,color:"#888",marginBottom:4,textTransform:"uppercase",letterSpacing:.3}}>Reference</div>
                          {r.preVideo?(
                            <div>
                              <div style={{fontSize:8,color:"#F59E0B",marginBottom:3}}>PRE-CLEAN ▼</div>
                              <div style={{position:"relative"}}>
                      <video src={r.preVideo} controls style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:8,border:"2px solid #F59E0B"}}/>
                      <button onClick={function(){downloadMedia(r.preVideo,"pre-clean-"+r.name+".mp4");}}
                        style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.8)",border:"none",borderRadius:6,color:"#F59E0B",fontSize:10,padding:"3px 8px",cursor:"pointer",fontWeight:700}}>⬇️</button>
                    </div>
                            </div>
                          ):r.refPhotos&&r.refPhotos[0]?(
                            <img src={r.refPhotos[0]} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:8,border:"2px solid #333"}}/>
                          ):r.refVideo?(
                            <video src={r.refVideo} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:8}}/>
                          ):null}
                        </div>
                        <div>
                          <div style={{fontSize:9,color:"#22C55E",marginBottom:4,textTransform:"uppercase",letterSpacing:.3}}>After Clean ✓</div>
                          <div style={{position:"relative"}}>
                      <video src={r.video} controls style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:8,border:"2px solid #22C55E"}}/>
                      <button onClick={function(){downloadMedia(r.video,"after-clean-"+r.name+".mp4");}}
                        style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.8)",border:"none",borderRadius:6,color:"#22C55E",fontSize:10,padding:"3px 8px",cursor:"pointer",fontWeight:700}}>⬇️</button>
                    </div>
                        </div>
                      </div>
                    </div>
                  );})}
                </div>
              );
            })()}
            {/* Tip selector */}
            {(function(){
              var prop2=(props||[]).find(function(p){return p.id===reviewJob.propertyId||p.name===reviewJob.propertyName;})||{};
              var linenExtra=(prop2.linenBags||0)*(prop2.linenRate||10);
              var finalTip=showCustomTip?Number(customTip)||0:tipAmount;
              var totalNow=reviewJob.pay+linenExtra+finalTip;
              return(
                <div style={{background:"#1A1A1A",borderRadius:10,padding:14,marginBottom:12,border:"1px solid #2A2A2A"}}>
                  <div style={{fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>💝 Add a Tip?</div>
                  <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                    {[0,5,10,20,50].map(function(amt){
                      var isActive=!showCustomTip&&tipAmount===amt;
                      return(
                        <button key={amt} onClick={function(){setTipAmount(amt);setShowCustomTip(false);setCustomTip("");}}
                          style={{flex:1,padding:"8px 4px",borderRadius:8,border:"1px solid "+(isActive?"#22C55E":"#333"),background:isActive?"rgba(34,197,94,.15)":"transparent",color:isActive?"#22C55E":"#888",fontSize:11,fontWeight:700,cursor:"pointer",minWidth:44}}>
                          {amt===0?"None":"$"+amt}
                        </button>
                      );
                    })}
                    <button onClick={function(){setShowCustomTip(true);setTipAmount(0);}}
                      style={{flex:1,padding:"8px 4px",borderRadius:8,border:"1px solid "+(showCustomTip?"#22C55E":"#333"),background:showCustomTip?"rgba(34,197,94,.15)":"transparent",color:showCustomTip?"#22C55E":"#888",fontSize:11,fontWeight:700,cursor:"pointer",minWidth:44}}>
                      ✏️
                    </button>
                  </div>
                  {showCustomTip&&(
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <span style={{color:"#888",fontSize:16}}>$</span>
                      <input type="number" value={customTip} onChange={function(e){setCustomTip(e.target.value);}}
                        placeholder="Enter tip amount"
                        autoFocus
                        style={{flex:1,background:"#0D0D0D",border:"1px solid #22C55E",borderRadius:8,color:"#FFF",fontSize:16,fontWeight:700,padding:"8px 12px",outline:"none"}}/>
                    </div>
                  )}
                  {finalTip>0&&(
                    <div style={{background:"rgba(34,197,94,.08)",borderRadius:6,padding:"6px 10px",fontSize:11,color:"#22C55E",fontWeight:700}}>
                      💝 Tip: ${finalTip.toFixed(2)} · Total will be ${totalNow.toFixed(2)}
                    </div>
                  )}
                </div>
              );
            })()}
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button onClick={function(){setRejectJob(reviewJob);setRejectReason("");setRejectCustom("");setReviewJob(null);setTipAmount(0);setCustomTip("");setShowCustomTip(false);}}
                style={{flex:1,background:"transparent",border:"1px solid #EF4444",borderRadius:8,padding:"10px",color:"#EF4444",fontSize:11,fontWeight:900,cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>REJECT</button>
              <button onClick={function(){
                var prop2=(props||[]).find(function(p){return p.id===reviewJob.propertyId||p.name===reviewJob.propertyName;})||{};
                var linenExtra=(prop2.linenBags||0)*(prop2.linenRate||10);
                var finalTip=showCustomTip?Number(customTip)||0:tipAmount;
                reviewJob.pay=reviewJob.pay+linenExtra+finalTip;
                approve(reviewJob.id);
                setTipAmount(0);setCustomTip("");setShowCustomTip(false);
              }}
                style={{flex:2,background:C.red,border:"none",borderRadius:8,padding:"10px",color:"#FFF",fontSize:11,fontWeight:900,cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>APPROVE & PAY</button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal - appears after approval */}
      {/* Reassign Slot Modal */}
      {reassignSlot&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:300,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#141414",borderRadius:"16px 16px 0 0",width:"100%",padding:24,fontFamily:"Inter,sans-serif"}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,letterSpacing:.5,color:"#CC0000",marginBottom:4}}>👤 REASSIGN JOB</div>
            <div style={{fontSize:12,color:"#888",marginBottom:16}}>{reassignSlot.prop.name} · {reassignSlot.slot.date} at {reassignSlot.slot.time}</div>
            <div style={{fontSize:11,color:"#888",fontWeight:700,letterSpacing:.5,marginBottom:8}}>SELECT NEW CLEANER</div>
            {(cleaners||[]).filter(function(c){return c.id!==reassignSlot.slot.cleanerId;}).map(function(c){
              var slotH=reassignSlot.slot&&reassignSlot.slot.time?parseInt(reassignSlot.slot.time.split(":")[0])||11:11;
              var busy=(reassignSlot.prop.schedule||[]).some(function(s){
                if(!s.cleanerId===c.id||s.date!==reassignSlot.slot.date||s.id===reassignSlot.slot.id||s.status==="declined")return false;
                var h=s.time?parseInt(s.time.split(":")[0])||11:11;
                return Math.abs(slotH-h)<3;
              });
              return(
                <div key={c.id} onClick={function(){if(!busy)setReassignCid(c.id);}}
                  style={{padding:"10px 14px",borderRadius:8,marginBottom:6,cursor:busy?"not-allowed":"pointer",
                    background:reassignCid===c.id?"rgba(204,0,0,.15)":busy?"#111":"#1A1A1A",
                    border:"1px solid "+(reassignCid===c.id?"#CC0000":busy?"#1A1A1A":"#2A2A2A"),
                    opacity:busy?0.4:1,
                    display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#FFF",flexShrink:0,overflow:"hidden"}}>
                    {c.photo?<img src={c.photo} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:c.avatar}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13}}>{c.name}</div>
                    <div style={{fontSize:11,color:"#888"}}>{c.role==="primary"?"⭐ Primary":"Backup"}{busy?" · Busy this day":""}</div>
                  </div>
                  {reassignCid===c.id&&<span style={{color:"#CC0000",fontSize:16}}>✓</span>}
                </div>
              );
            })}
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={function(){setReassignSlot(null);setReassignCid("");}}
                style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:8,padding:"11px",color:"#888",fontSize:12,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={function(){
                if(!reassignCid)return;
                setProps(function(ps){return ps.map(function(pp){
                  if(pp.id!==reassignSlot.prop.id)return pp;
                  return Object.assign({},pp,{schedule:(pp.schedule||[]).map(function(s){
                    return s.id!==reassignSlot.slot.id?s:Object.assign({},s,{
                      cleanerId:reassignCid,
                      status:"pending_acceptance",
                      assignedAt:new Date().toISOString()
                    });
                  })});
                });});
                // Notify new cleaner
                var newCl=(cleaners||[]).find(function(c){return c.id===reassignCid;});
                setNotifications(function(prev){return [{
                  id:"notif"+Date.now(),type:"assigned",icon:"📋",
                  title:"New Job Assigned!",
                  body:"You have been assigned to clean "+(reassignSlot.prop.name||"a property")+" on "+reassignSlot.slot.date+" at "+(reassignSlot.slot.time||"11:00")+". Please accept or decline within 8 hours.",
                  forRole:"cleaner",forCleaner:reassignCid,
                  navTo:"My Jobs",time:new Date().toISOString(),read:false
                }].concat(prev).slice(0,50);});
                setReassignSlot(null);setReassignCid("");
              }}
                style={{flex:2,background:reassignCid?"#CC0000":"#2A2A2A",border:"none",borderRadius:8,padding:"11px",
                  color:reassignCid?"#FFF":"#555",fontSize:12,fontWeight:900,fontFamily:"Arial Black,sans-serif",
                  cursor:reassignCid?"pointer":"default",letterSpacing:.3}}>
                CONFIRM REASSIGN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Cleaner Confirm Modal */}
      {removeJobConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:400,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#141414",borderRadius:"16px 16px 0 0",width:"100%",padding:24,fontFamily:"Inter,sans-serif"}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,color:"#EF4444",marginBottom:6}}>✕ REMOVE CLEANER</div>
            <div style={{fontSize:13,color:"#888",marginBottom:6}}>
              {(function(){var cl=(cleaners||[]).find(function(c){return c.id===removeJobConfirm.cleanerId;});return cl?cl.name:"This cleaner";})()}
            </div>
            <div style={{fontSize:13,color:"#888",marginBottom:16}}>
              {removeJobConfirm.propertyName}{removeJobConfirm.date?" · "+removeJobConfirm.date:""}
            </div>
            <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#EF4444",marginBottom:20,lineHeight:1.6}}>
              This will remove the cleaner from the job and reset the slot to open. The cleaner will be notified. You can reassign the slot from Properties.
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){setRemoveJobConfirm(null);}}
                style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:8,padding:"11px",color:"#888",fontSize:12,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={function(){
                var job=removeJobConfirm;
                setProps(function(ps){return ps.map(function(pp){
                  if(pp.id!==job.propertyId&&pp.name!==job.propertyName)return pp;
                  return Object.assign({},pp,{schedule:(pp.schedule||[]).map(function(s){
                    if(s.cleanerId!==job.cleanerId||s.date!==job.date)return s;
                    return Object.assign({},s,{cleanerId:null,status:"open",assignedAt:null});
                  })});
                });});
                setJobs(function(js){return js.filter(function(j){return j.id!==job.id;});});
                setNotifications(function(prev){return [{
                  id:"notif"+Date.now(),type:"info",icon:"ℹ️",
                  title:"Job Assignment Removed",
                  body:"Harvey has removed you from "+job.propertyName+(job.date?" on "+job.date:"")+". Contact Harvey if you have questions.",
                  forRole:"cleaner",forCleaner:job.cleanerId,
                  navTo:"My Jobs",time:new Date().toISOString(),read:false
                }].concat(prev).slice(0,50);});
                setRemoveJobConfirm(null);
              }}
                style={{flex:2,background:"#EF4444",border:"none",borderRadius:8,padding:"11px",color:"#FFF",fontSize:12,fontWeight:900,fontFamily:"Arial Black,sans-serif",cursor:"pointer",letterSpacing:.3}}>
                YES, REMOVE CLEANER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Job Modal */}
      {rejectJob&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:300,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#141414",borderRadius:"16px 16px 0 0",width:"100%",padding:24,fontFamily:"Inter,sans-serif",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,letterSpacing:.5,color:"#EF4444",marginBottom:4}}>❌ REJECT SUBMISSION</div>
            <div style={{fontSize:12,color:"#888",marginBottom:16}}>{rejectJob.propertyName} · {rejectJob.completedAt?new Date(rejectJob.completedAt).toLocaleDateString("en-US",{month:"short",day:"numeric"}):""}</div>

            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,letterSpacing:.5,marginBottom:10,color:"#FFF"}}>SELECT A REASON</div>

            {[
              "Photos/videos too dark or blurry",
              "Missing required after-clean videos",
              "Tasks not fully completed",
              "Property not staged correctly",
              "Wrong property submitted",
              "Poor photo angles — can't verify quality",
              "Other (explain below)",
            ].map(function(reason){return(
              <div key={reason} onClick={function(){setRejectReason(reason);}}
                style={{padding:"10px 14px",borderRadius:8,marginBottom:6,cursor:"pointer",
                  background:rejectReason===reason?"rgba(239,68,68,.15)":"#1A1A1A",
                  border:"1px solid "+(rejectReason===reason?"#EF4444":"#2A2A2A"),
                  color:rejectReason===reason?"#FFF":"#888",
                  fontSize:12,fontWeight:rejectReason===reason?700:400,
                  display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:16,height:16,borderRadius:"50%",border:"2px solid "+(rejectReason===reason?"#EF4444":"#444"),background:rejectReason===reason?"#EF4444":"transparent",flexShrink:0}}/>
                {reason}
              </div>
            );})}

            {/* Custom note */}
            <div style={{marginTop:10,marginBottom:16}}>
              <div style={{fontSize:11,color:"#888",marginBottom:6}}>Additional notes to cleaner (optional)</div>
              <textarea value={rejectCustom} onChange={function(e){setRejectCustom(e.target.value);}}
                placeholder="e.g. The bathroom mirror still had streaks, and the bed wasn't fully made..."
                rows={3}
                style={{width:"100%",background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:8,color:"#FFF",fontSize:12,padding:"10px 12px",outline:"none",resize:"none",fontFamily:"Inter,sans-serif",lineHeight:1.6,boxSizing:"border-box"}}/>
            </div>

            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){setRejectJob(null);setRejectReason("");setRejectCustom("");}}
                style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:8,padding:"11px",color:"#888",fontSize:12,cursor:"pointer"}}>
                Cancel
              </button>
              <button
                onClick={function(){
                  if(!rejectReason)return;
                  var fullReason=rejectCustom.trim()?rejectReason+" — "+rejectCustom.trim():rejectReason;
                  reject(rejectJob.id,fullReason);
                  setRejectJob(null);setRejectReason("");setRejectCustom("");
                }}
                style={{flex:2,background:rejectReason?"#EF4444":"#333",border:"none",borderRadius:8,padding:"11px",color:rejectReason?"#FFF":"#666",fontSize:12,fontWeight:900,fontFamily:"Arial Black,sans-serif",cursor:rejectReason?"pointer":"default",letterSpacing:.3,opacity:rejectReason?1:0.5}}>
                SEND REJECTION
              </button>
            </div>
          </div>
        </div>
      )}

      {ratingJob&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:300,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#141414",borderRadius:"16px 16px 0 0",width:"100%",padding:24,fontFamily:"Inter,sans-serif",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{textAlign:"center",marginBottom:6}}>
              {(function(){
                var cl=cleaners.find(function(c){return c.id===ratingJob.cleanerId;})||{};
                var connected=cl.stripeStatus==="connected";
                return(
                  <div>
                    <div style={{fontSize:32,marginBottom:6}}>{connected?"🎉":"⚠️"}</div>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,letterSpacing:.5,marginBottom:4}}>{connected?"PAYMENT SENT!":"JOB APPROVED"}</div>
                    {connected?(
                      <div>
                        <div style={{fontSize:12,color:"#22C55E",fontWeight:700,marginBottom:4}}>{fmt(ratingJob.pay)} → {cl.name} via Stripe ✓</div>
                        <div style={{fontSize:11,color:C.muted,marginBottom:20}}>Cleaner will receive funds within 1-2 business days</div>
                      </div>
                    ):(
                      <div>
                        <div style={{fontSize:12,color:"#F59E0B",fontWeight:700,marginBottom:4}}>⚠️ {cl.name} hasn't connected Stripe yet</div>
                        <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Payment of {fmt(ratingJob.pay)} is on hold until they complete Stripe setup</div>
                        <div style={{background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.3)",borderRadius:8,padding:"10px 12px",marginBottom:20,textAlign:"left"}}>
                          <div style={{fontSize:11,color:"#F59E0B",fontWeight:700,marginBottom:4}}>📧 Action Required</div>
                          <div style={{fontSize:11,color:"#888",lineHeight:1.5}}>Go to Team → tap {cl.name} → Info tab → Send Stripe Invite to get them connected so you can release payment.</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div style={{borderTop:"1px solid #2A2A2A",paddingTop:20}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,letterSpacing:.5,marginBottom:4}}>RATE THIS CLEANER</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:16}}>How did they do on {ratingJob.propertyName}?</div>
              <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:20}}>
                {[1,2,3,4,5].map(function(star){return(
                  <button key={star} onClick={function(){setManagerRating(star);}}
                    style={{fontSize:32,background:"none",border:"none",cursor:"pointer",opacity:managerRating>=star?1:.3,transform:managerRating===star?"scale(1.2)":"scale(1)",transition:"all .2s"}}>⭐</button>
                );})}
              </div>
              {managerRating>0&&(
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:11,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>
                    {managerRating===5?"⭐ Excellent work!":managerRating===4?"👍 Good job!":managerRating===3?"😐 Average":managerRating===2?"👎 Below standard":"❌ Poor performance"}
                  </div>
                  <textarea value={managerComment} onChange={function(e){setManagerComment(e.target.value);}}
                    placeholder="Leave a comment for this cleaner (optional)..."
                    rows={3}
                    style={{width:"100%",background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:8,color:"#FFF",fontSize:12,padding:"10px 12px",outline:"none",resize:"none",fontFamily:"Inter,sans-serif",lineHeight:1.6,boxSizing:"border-box"}}/>
                </div>
              )}
              <button onClick={submitRating}
                style={{width:"100%",background:managerRating>0?C.red:"#2A2A2A",border:"none",borderRadius:10,padding:"14px",color:managerRating>0?"#FFF":"#555",fontSize:13,fontWeight:900,fontFamily:"Arial Black,sans-serif",letterSpacing:.5,cursor:managerRating>0?"pointer":"default",marginBottom:10}}>
                {managerRating>0?"SUBMIT RATING":"TAP A STAR TO RATE"}
              </button>
              <button onClick={function(){setRatingJob(null);}}
                style={{width:"100%",background:"transparent",border:"none",color:"#555",fontSize:12,cursor:"pointer",padding:"8px"}}>Skip for now</button>
              {/* Guest Review Link */}
              <div style={{borderTop:"1px solid #2A2A2A",paddingTop:14,marginTop:6}}>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:4,color:"#3B82F6"}}>🔗 SEND GUEST REVIEW LINK</div>
                <div style={{fontSize:11,color:"#888",lineHeight:1.5,marginBottom:10}}>Share this link with your guest so they can rate the cleanliness. Their score will update this property's rating.</div>
                <div style={{background:"#0D0D0D",border:"1px solid #2A2A2A",borderRadius:8,padding:"10px 12px",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                  <div style={{fontSize:11,color:"#AAA",fontFamily:"monospace",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {"app.turnready.app/review?job="+(ratingJob?ratingJob.id:"")+"&prop="+(ratingJob?ratingJob.propertyId||ratingJob.propertyName:"")}
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={function(){
                    var link="app.turnready.app/review?job="+(ratingJob?ratingJob.id:"")+"&prop="+(ratingJob?ratingJob.propertyId||ratingJob.propertyName:"");
                    if(navigator.clipboard)navigator.clipboard.writeText(link);
                    setGuestLinkCopied(true);setTimeout(function(){setGuestLinkCopied(false);},2000);
                  }} style={{flex:1,background:guestLinkCopied?"#22C55E":"#3B82F6",border:"none",borderRadius:8,padding:"9px",color:"#FFF",fontSize:11,fontWeight:900,cursor:"pointer",fontFamily:"Arial Black,sans-serif",letterSpacing:.3}}>
                    {guestLinkCopied?"✓ COPIED!":"COPY LINK"}
                  </button>
                  {navigator&&navigator.share&&<button onClick={function(){
                    var link="app.turnready.app/review?job="+(ratingJob?ratingJob.id:"")+"&prop="+(ratingJob?ratingJob.propertyId||ratingJob.propertyName:"");
                    navigator.share({title:"Rate your stay",text:"How clean was your rental? Leave a quick review:",url:"https://"+link});
                  }} style={{flex:1,background:"transparent",border:"1px solid #3B82F6",borderRadius:8,padding:"9px",color:"#3B82F6",fontSize:11,fontWeight:900,cursor:"pointer",fontFamily:"Arial Black,sans-serif",letterSpacing:.3}}>SHARE</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function Payroll({cleaners,jobs}){
  const [selectedCleaner,setSelectedCleaner]=useState(null);
  var total=jobs.filter(function(j){return j.status==="approved";}).reduce(function(s,j){return s+j.pay;},0);

  if(selectedCleaner){
    var cl=cleaners.find(function(c){return c.id===selectedCleaner;});
    if(!cl)return null;
    var history=jobs.filter(function(j){return j.cleanerId===cl.id&&j.status==="approved";});
    var pending=jobs.filter(function(j){return j.cleanerId===cl.id&&j.status==="pending_approval";});
    var clTotal=history.reduce(function(s,j){return s+j.pay;},0);
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <button onClick={function(){setSelectedCleaner(null);}} style={{background:"none",border:"none",color:C.red,fontSize:20,cursor:"pointer",padding:0}}>{"<"}</button>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,letterSpacing:1}}>{cl.name}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
          <div style={{background:C.card,borderRadius:10,padding:"12px 8px",textAlign:"center",border:"1px solid "+C.border}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,color:C.red}}>${clTotal.toFixed(0)}</div>
            <div style={{fontSize:9,color:C.muted,marginTop:3,textTransform:"uppercase",letterSpacing:.3}}>Total Paid</div>
          </div>
          <div style={{background:C.card,borderRadius:10,padding:"12px 8px",textAlign:"center",border:"1px solid "+C.border}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900}}>{history.length}</div>
            <div style={{fontSize:9,color:C.muted,marginTop:3,textTransform:"uppercase",letterSpacing:.3}}>Paid Jobs</div>
          </div>
          <div style={{background:C.card,borderRadius:10,padding:"12px 8px",textAlign:"center",border:"1px solid "+(pending.length>0?"rgba(245,158,11,.4)":C.border)}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,color:pending.length>0?"#F59E0B":C.white}}>{pending.length}</div>
            <div style={{fontSize:9,color:C.muted,marginTop:3,textTransform:"uppercase",letterSpacing:.3}}>Pending</div>
          </div>
        </div>
        <div className="card">
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,marginBottom:12}}>PAYMENT HISTORY</div>
          {history.length===0&&<div style={{fontSize:12,color:C.muted,textAlign:"center",padding:20}}>No payments yet</div>}
          {history.map(function(j){
            return(
              <div key={j.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #222"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>{j.propertyName||"Property"}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>{j.completedAt?new Date(j.completedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—"}</div>
                </div>
                <span style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,color:"#22C55E"}}>+${j.pay}</span>
              </div>
            );
          })}
          {pending.length>0&&(
            <div style={{marginTop:12,padding:"10px 12px",background:"rgba(245,158,11,.08)",borderRadius:8,border:"1px solid rgba(245,158,11,.2)"}}>
              <div style={{fontSize:11,color:"#F59E0B",fontWeight:700,marginBottom:6}}>{pending.length} pending payment{pending.length!==1?"s":""}</div>
              {pending.map(function(j){
                return(
                  <div key={j.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                    <span style={{color:C.muted}}>{j.propertyName||"Property"}</span>
                    <span style={{color:"#F59E0B",fontWeight:700}}>${j.pay} pending</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return(
    <div>
      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1,marginBottom:4}}>PAYROLL</div>
      <div style={{color:C.muted,fontSize:12,marginBottom:16}}>Total paid out: <span style={{color:C.red,fontWeight:700}}>{fmt(total)}</span> via Stripe</div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {cleaners.map(function(c){
          var cj=jobs.filter(function(j){return j.cleanerId===c.id&&j.status==="approved";});
          var pend=jobs.filter(function(j){return j.cleanerId===c.id&&j.status==="pending_approval";}).length;
          var earned=cj.reduce(function(s,j){return s+j.pay;},0);
          return(
            <div key={c.id} className="card" onClick={function(){setSelectedCleaner(c.id);}} style={{cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div className="avatar" style={{width:42,height:42,fontSize:14,flexShrink:0,overflow:"hidden",padding:c.photo?0:undefined}}>{c.photo?<img src={c.photo} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:c.avatar}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14}}>{c.name}</div>
                  <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.email}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontFamily:"Arial Black,sans-serif",fontWeight:900,fontSize:18,color:C.red}}>${earned.toFixed(0)}</div>
                  <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.3}}>earned</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
                <div style={{background:C.surface,borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                  <div style={{fontWeight:700,fontSize:14}}>{cj.length}</div>
                  <div style={{fontSize:9,color:C.muted,marginTop:2,textTransform:"uppercase",letterSpacing:.3}}>Paid</div>
                </div>
                <div style={{background:C.surface,borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                  <div style={{fontWeight:700,fontSize:14,color:pend>0?"#F59E0B":C.white}}>{pend}</div>
                  <div style={{fontSize:9,color:C.muted,marginTop:2,textTransform:"uppercase",letterSpacing:.3}}>Pending</div>
                </div>
                <div style={{background:C.surface,borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#F59E0B"}}>★{(c.rating||5).toFixed(1)}</div>
                  <div style={{fontSize:9,color:C.muted,marginTop:2,textTransform:"uppercase",letterSpacing:.3}}>Rating</div>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:11,color:c.stripeStatus==="connected"?"#22C55E":c.stripeStatus==="pending"?"#F59E0B":"#EF4444",fontWeight:600}}>
              {c.stripeStatus==="connected"?"💳 Stripe Connected ✓":c.stripeStatus==="pending"?"⏳ Stripe Pending":"❌ Stripe Not Set Up"}
            </div>
                <div style={{fontSize:11,color:C.red,fontWeight:700}}>View History →</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function QuickTip(){
  var tips=[
    {icon:"📸",title:"Always Document First",tip:"Record a 30–60 second walkthrough video BEFORE you touch anything. This protects you from being blamed for pre-existing damage."},
    {icon:"🧹",title:"Clean Top to Bottom",tip:"Always dust ceiling fans and shelves before vacuuming. Gravity works against you — don't vacuum twice!"},
    {icon:"🛏️",title:"Hospital Corners Every Time",tip:"Guests notice the bed first. Take the extra 60 seconds for tight corners and centered decorative pillows. It sets the whole tone."},
    {icon:"🚿",title:"Bathroom = 5-Star Standard",tip:"Shine every fixture, fold the toilet paper end into a point, and make sure there are zero water spots on mirrors. Guests judge cleanliness by bathrooms."},
    {icon:"⏰",title:"Never Leave Without Submitting",tip:"Do NOT leave the property until your post-clean video and job submission are uploaded. Payment cannot be processed without it."},
    {icon:"📱",title:"Report Issues Immediately",tip:"Found damage, missing items, or strong odors? Message Mr. Harvey BEFORE you start cleaning. Document everything with photos."},
    {icon:"🏠",title:"Staging = Guest Experience",tip:"Follow the staging guide for each room exactly. The way you leave the property is the first impression the guest has. Make it count."},
    {icon:"💬",title:"Communication is Key",tip:"Running late? Found a problem? Just got done? Always message Mr. Harvey. Over-communication is always better than silence."},
    {icon:"🔑",title:"Secure the Property",tip:"Before leaving, double-check all doors and windows are locked, keys are returned to their proper place, and the lockbox is secured."},
    {icon:"⭐",title:"5-Star Every Time",tip:"Treat every property like your most important client is checking in tonight. Consistency is what builds your reputation and keeps you on the schedule."},
  ];
  var [tipIdx,setTipIdx]=useState(function(){return Math.floor(Math.random()*tips.length);});
  var tip=tips[tipIdx];
  return(
    <div className="card" style={{border:"1px solid rgba(204,0,0,.2)",background:"linear-gradient(135deg,rgba(204,0,0,.05),transparent)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,color:C.red}}>💡 QUICK TIP</div>
        <button onClick={function(){setTipIdx(function(i){return(i+1)%tips.length;});}}
          style={{background:"transparent",border:"1px solid #333",borderRadius:6,color:"#666",fontSize:10,padding:"3px 8px",cursor:"pointer"}}>Next →</button>
      </div>
      <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
        <span style={{fontSize:28,flexShrink:0}}>{tip.icon}</span>
        <div>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,marginBottom:5}}>{tip.title}</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{tip.tip}</div>
        </div>
      </div>
    </div>
  );
}

function CleanerDashboard({user,cleaners,jobs,props,setView}){
  var cl=cleaners.find(function(c){return c.id===user.id;})||user;
  var myJobs=jobs.filter(function(j){return j.cleanerId===user.id;});
  var earned=myJobs.filter(function(j){return j.status==="approved";}).reduce(function(s,j){return s+j.pay;},0);
  var pending=myJobs.filter(function(j){return j.status==="pending_approval";});
  var myProps=(props||[]).filter(function(p){
    var inSchedule=(p.schedule||[]).some(function(s){
      return s.cleanerId===user.id||s.cleanerId2===user.id;
    });
    return inSchedule||p.assignedTo===user.id;
  });
  // No fallback - new cleaners should see empty state until assigned
  var today=new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  var upcoming=[];
  myProps.forEach(function(p){
    (p.schedule||[]).forEach(function(slot){
      if(slot.cleanerId===user.id&&slot.status!=="complete"){
        upcoming.push({prop:p,slot:slot});
      }
    });
  });
  upcoming.sort(function(a,b){return new Date(a.slot.date)-new Date(b.slot.date);});

  return(
    <div>
      {/* Header */}
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1}}>MY DASHBOARD</div>
        <div style={{color:C.muted,fontSize:12,marginTop:2}}>{today}</div>
      </div>

      {/* ❌ REJECTED / NEEDS RESUBMIT - show at top if any */}
      {(function(){
        var rejectedJobs=(jobs||[]).filter(function(j){return j.cleanerId===user.id&&j.status==="needs_resubmit";});
        if(!rejectedJobs.length)return null;
        return(
          <div style={{marginBottom:14}}>
            {rejectedJobs.map(function(job){return(
              <div key={job.id} onClick={function(){setView("My Jobs");}}
                style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.5)",borderRadius:12,padding:"12px 14px",marginBottom:8,cursor:"pointer"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <span style={{fontSize:20}}>❌</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,color:"#EF4444",letterSpacing:.3}}>JOB REJECTED — ACTION NEEDED</div>
                    <div style={{fontSize:11,color:"#888",marginTop:1}}>{job.propertyName}</div>
                  </div>
                  <div style={{fontSize:10,color:"#EF4444",fontWeight:700}}>TAP →</div>
                </div>
                {job.rejectReason&&(
                  <div style={{background:"rgba(239,68,68,.12)",borderRadius:6,padding:"6px 10px",fontSize:11,color:"#EF4444",lineHeight:1.5}}>
                    <strong>Harvey said:</strong> {job.rejectReason}
                  </div>
                )}
              </div>
            );})}
          </div>
        );
      })()}

      {/* ⏳ PENDING ACCEPTANCE - jobs waiting for response */}
      {(function(){
        var pendingSlots=[];
        (props||[]).forEach(function(p){
          (p.schedule||[]).forEach(function(slot){
            if((slot.cleanerId===user.id||slot.cleanerId2===user.id)&&slot.status==="pending_acceptance"){
              pendingSlots.push({prop:p,slot:slot});
            }
          });
        });
        if(!pendingSlots.length)return null;
        return(
          <div style={{marginBottom:14}}>
            {pendingSlots.map(function(item){
              var hoursLeft=item.slot.assignedAt?Math.max(0,8-((Date.now()-new Date(item.slot.assignedAt).getTime())/3600000)):8;
              var urgent=hoursLeft<2;
              return(
                <div key={item.slot.id} onClick={function(){setView("My Jobs");}}
                  style={{background:urgent?"rgba(239,68,68,.08)":"rgba(245,158,11,.08)",
                    border:"1px solid "+(urgent?"rgba(239,68,68,.5)":"rgba(245,158,11,.5)"),
                    borderRadius:12,padding:"12px 14px",marginBottom:8,cursor:"pointer"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                    <span style={{fontSize:20}}>{urgent?"🚨":"📋"}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,
                        color:urgent?"#EF4444":"#F59E0B",letterSpacing:.3}}>
                        {urgent?"URGENT — RESPONSE NEEDED":"NEW JOB ASSIGNED — ACTION REQUIRED"}
                      </div>
                      <div style={{fontSize:11,color:"#888",marginTop:1}}>{item.prop.name} · {item.slot.date} at {item.slot.time}</div>
                    </div>
                    <div style={{fontSize:10,color:urgent?"#EF4444":"#F59E0B",fontWeight:700}}>TAP →</div>
                  </div>
                  <div style={{background:urgent?"rgba(239,68,68,.1)":"rgba(245,158,11,.1)",borderRadius:6,padding:"5px 10px",fontSize:11,color:urgent?"#EF4444":"#F59E0B",fontWeight:600}}>
                    ⏱ {hoursLeft<1?(Math.round(hoursLeft*60)+"m left"):Math.round(hoursLeft)+"h left to accept or decline"}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        <div onClick={function(){setView("My Earnings");}} style={{background:C.card,border:"1px solid "+(C.border),borderRadius:10,padding:"10px 6px",cursor:"pointer",textAlign:"center",overflow:"hidden"}}>
          <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>EARNED</div>
          <div style={{fontSize:16,fontWeight:700,color:C.red}}>${earned.toFixed(0)}</div>
          <div style={{fontSize:8,color:C.muted,marginTop:3}}>total paid</div>
          <div style={{fontSize:8,color:C.red,marginTop:5,fontWeight:700}}>View →</div>
        </div>
        <div onClick={function(){setView("My Jobs");}} style={{background:C.card,border:"1px solid "+(pending.length>0?"rgba(245,158,11,.4)":C.border),borderRadius:10,padding:"10px 6px",cursor:"pointer",textAlign:"center",overflow:"hidden"}}>
          <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>PENDING</div>
          <div style={{fontSize:22,fontWeight:700,color:pending.length>0?"#F59E0B":C.white}}>{pending.length}</div>
          <div style={{fontSize:8,color:C.muted,marginTop:3}}>awaiting pay</div>
          <div style={{fontSize:8,color:pending.length>0?"#F59E0B":C.muted,marginTop:5,fontWeight:700}}>{pending.length>0?"Tap to view":"All clear"}</div>
        </div>
        <div onClick={function(){setView("My Ratings");}} style={{background:C.card,border:"1px solid "+(C.border),borderRadius:10,padding:"10px 6px",textAlign:"center",overflow:"hidden",cursor:"pointer"}}>
          <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>RATING</div>
          <div style={{fontSize:18,fontWeight:700,color:"#F59E0B"}}>★{(cl.rating||5).toFixed(1)}</div>
          <div style={{fontSize:8,color:C.muted,marginTop:3}}>{cl.jobsCompleted||0} jobs done</div>
          <div style={{fontSize:8,color:"#F59E0B",marginTop:5,fontWeight:700}}>View →</div>
        </div>
      </div>

      {/* Upcoming jobs */}
      {upcoming.length>0&&(
        <div className="card" style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5}}>UPCOMING JOBS</div>
            <button onClick={function(){setView("My Jobs");}} style={{background:"none",border:"none",color:C.red,fontSize:11,cursor:"pointer",fontWeight:600}}>View all &gt;</button>
          </div>
          {upcoming.slice(0,3).map(function(item){
            return(
              <div key={item.slot.id||item.slot.date} onClick={function(){setView("My Jobs");}}
                style={{borderBottom:"1px solid #222",paddingBottom:8,marginBottom:8,cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:600,fontSize:12}}>{item.prop.name}</div>
                  <span style={{background:"rgba(34,197,94,.15)",color:"#22C55E",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10}}>${item.prop.pay}.00</span>
                </div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{item.slot.date} at {item.slot.time||"11:00"}</div>
                <div style={{fontSize:9,color:C.red,marginTop:3,fontWeight:600}}>Tap to open →</div>
              </div>
            );
          })}
        </div>
      )}

      {/* No jobs message */}
      {upcoming.length===0&&(
        <div className="card" style={{marginBottom:14,textAlign:"center",padding:30}}>
          <div style={{fontSize:32,marginBottom:8}}>🧹</div>
          <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>No upcoming jobs</div>
          <div style={{fontSize:11,color:C.muted}}>Your manager will assign jobs to you</div>
        </div>
      )}

      {/* Pending payment banner */}
      {pending.length>0&&(
        <div className="card" style={{border:"1px solid rgba(245,158,11,.4)",cursor:"pointer",marginBottom:14}} onClick={function(){setView("My Jobs");}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#F59E0B",marginBottom:3}}>{pending.length} job{pending.length!==1?"s":""} awaiting approval</div>
              <div style={{fontSize:11,color:C.muted}}>Submitted and waiting for manager to pay</div>
            </div>
            <div style={{fontSize:18,color:"#F59E0B"}}>›</div>
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <QuickTip/>
    </div>
  );
}


function CleanerJobs({user,props,setProps,jobs,setJobs,cleaners,pendingRemovals,setPendingRemovals,addNotification}){
  const [activeId,setActiveId]=useState(null);
  const [showDone,setShowDone]=useState(false);
  const [jobStarted,setJobStarted]=useState({});
  const [activeTab,setActiveTab]=useState("tasks");
  const [removeRequest,setRemoveRequest]=useState(null);
  const [removeReason,setRemoveReason]=useState("");
  const [removeCustom,setRemoveCustom]=useState("");
  const [showEmergency,setShowEmergency]=useState(false);
  const [emergencyNote,setEmergencyNote]=useState("");
  const [emergencyType,setEmergencyType]=useState("");
  const [emergencyFiled,setEmergencyFiled]=useState({});
  const [jobsTab,setJobsTab]=useState("active");
  const [selectedHistory,setSelectedHistory]=useState(null);
  const [jobStartTime,setJobStartTime]=useState({});
  const [now,setNow]=useState(Date.now());

  // Live clock - updates every second when a job is in progress
  useEffect(function(){
    var hasActive=Object.keys(jobStarted).some(function(k){return jobStarted[k];});
    if(!hasActive)return;
    var interval=setInterval(function(){setNow(Date.now());},1000);
    return function(){clearInterval(interval);};
  },[jobStarted]);

  // Get props assigned to this cleaner via schedule slots
  // Only show properties assigned to this cleaner
  var myProps=(props||[]).filter(function(p){
    var inSchedule=(p.schedule||[]).some(function(s){
      return s.cleanerId===user.id||s.cleanerId2===user.id;
    });
    return inSchedule||p.assignedTo===user.id;
  });

  function startJob(prop){
    var startT=Date.now();
    setJobStartTime(function(prev){var u=Object.assign({},prev);u[prop.id]=startT;return u;});
    setJobStarted(function(prev){var u=Object.assign({},prev);u[prop.id]=true;return u;});
    // Update slot status to in_progress AND clear inventory/task statuses for fresh start
    setProps(function(ps){return ps.map(function(pp){
      if(pp.id!==prop.id)return pp;
      // Check if this is a deep clean job
      var mySlot=(pp.schedule||[]).find(function(s){return (s.cleanerId===user.id||s.cleanerId2===user.id)&&(s.status==="accepted"||s.status==="pending_acceptance");});
      var isDeepCleanJob=mySlot&&mySlot.deepClean;
      var deepCleanTasks=isDeepCleanJob?[{id:"dc1",section:"Deep Clean — Kitchen",label:"Clean inside oven completely — remove racks, scrub walls and bottom",done:false},{id:"dc2",section:"Deep Clean — Kitchen",label:"Pull out fridge and stove — clean behind and underneath",done:false},{id:"dc3",section:"Deep Clean — Kitchen",label:"Clean inside fridge completely — all shelves, drawers, and door panels",done:false},{id:"dc4",section:"Deep Clean — Kitchen",label:"Degrease exhaust hood and filters",done:false},{id:"dc5",section:"Deep Clean — Kitchen",label:"Clean inside all cabinets and drawers — remove everything, wipe, replace",done:false},{id:"dc6",section:"Deep Clean — Kitchen",label:"Descale coffee maker and clean all small appliances thoroughly",done:false},{id:"dc7",section:"Deep Clean — Bathrooms",label:"Scrub grout lines on all tile walls and floors",done:false},{id:"dc8",section:"Deep Clean — Bathrooms",label:"Remove and deep clean showerhead — remove mineral deposits",done:false},{id:"dc9",section:"Deep Clean — Bathrooms",label:"Clean behind and around toilet base completely",done:false},{id:"dc10",section:"Deep Clean — Bathrooms",label:"Wipe down all baseboards in bathrooms",done:false},{id:"dc11",section:"Deep Clean — Bathrooms",label:"Clean exhaust fan cover and vent",done:false},{id:"dc12",section:"Deep Clean — Bedrooms",label:"Flip or rotate all mattresses",done:false},{id:"dc13",section:"Deep Clean — Bedrooms",label:"Vacuum all mattresses and box springs",done:false},{id:"dc14",section:"Deep Clean — Bedrooms",label:"Clean all mirrors and glass surfaces streak-free",done:false},{id:"dc15",section:"Deep Clean — Bedrooms",label:"Wipe down all furniture including undersides and backs",done:false},{id:"dc16",section:"Deep Clean — Bedrooms",label:"Clean all window tracks and sills inside",done:false},{id:"dc17",section:"Deep Clean — Living Areas",label:"Clean ceiling fans blades top and bottom",done:false},{id:"dc18",section:"Deep Clean — Living Areas",label:"Wipe down all light fixtures and lampshades",done:false},{id:"dc19",section:"Deep Clean — Living Areas",label:"Clean all blinds — wipe each slat individually",done:false},{id:"dc20",section:"Deep Clean — Living Areas",label:"Wipe all baseboards throughout the entire property",done:false},{id:"dc21",section:"Deep Clean — Living Areas",label:"Clean all door frames, handles, and hinges",done:false},{id:"dc22",section:"Deep Clean — Living Areas",label:"Clean all vents and air return covers",done:false},{id:"dc23",section:"Deep Clean — Living Areas",label:"Spot clean all walls — remove marks, scuffs, fingerprints",done:false},{id:"dc24",section:"Deep Clean — Floors",label:"Move all furniture — clean floors completely underneath",done:false},{id:"dc25",section:"Deep Clean — Floors",label:"Scrub all grout lines on hard floors",done:false},{id:"dc26",section:"Deep Clean — Floors",label:"Steam clean or deep vacuum all carpets",done:false},{id:"dc27",section:"Deep Clean — Floors",label:"Clean all floor edges and corners thoroughly",done:false},{id:"dc28",section:"Deep Clean — Final",label:"✅ Deep clean complete — property is reset to baseline standard",done:false}]:[];
      var baseTasks=(pp.tasks||[]).map(function(t){return Object.assign({},t,{done:false});});
      return Object.assign({},pp,{
        inventory:(pp.inventory||[]).map(function(i){return Object.assign({},i,{cleanerStatus:null});}),
        tasks:baseTasks.concat(deepCleanTasks),
        schedule:(pp.schedule||[]).map(function(s){
          return s.cleanerId===user.id&&(s.status==="accepted"||s.status==="pending_acceptance")?Object.assign({},s,{status:"in_progress",startedAt:new Date().toISOString()}):s;
        })
      });
    });});
    if(addNotification){
      addNotification({
        type:"job_started",
        icon:"🧹",
        title:"Job Started — "+prop.name,
        body:user.name+" began cleaning "+prop.name+" at "+new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
        forRole:"manager",
        navTo:"Properties",
        time:new Date().toISOString(),
        read:false
      });
    }
  }

  function toggleTask(propId,taskId){
    setProps(function(ps){return ps.map(function(p){
      if(p.id!==propId)return p;
      return Object.assign({},p,{tasks:(p.tasks||[]).map(function(t){return t.id===taskId?Object.assign({},t,{done:!t.done}):t;})});
    });});
  }

  function updateInv(propId,invId,status){
    setProps(function(ps){return ps.map(function(p){
      if(p.id!==propId)return p;
      var updated=Object.assign({},p,{inventory:(p.inventory||[]).map(function(i){return i.id===invId?Object.assign({},i,{cleanerStatus:status}):i;})});
      // Fire notification if item marked low
      if(status==="low"&&addNotification){
        var inv=(p.inventory||[]).find(function(i){return i.id===invId;});
        if(inv){
          // Count how many props have this item low
          var lowCount=ps.filter(function(pp){return (pp.inventory||[]).some(function(ii){return ii.item===inv.item&&(ii.cleanerStatus==="low"||ii.inStock===0);});}).length+1;
          if(lowCount>=2){
            addNotification({type:"supply",icon:"📦",title:"Supply Alert: "+inv.item,body:inv.item+" is running low at "+p.name+(lowCount>2?" and "+(lowCount-1)+" other properties":""),forRole:"manager",navTo:"Properties",time:new Date().toISOString(),read:false});
          }
        }
      }
      return updated;
    });});
  }

  function uploadRoomVideo(propId,roomId,file){
    if(!file)return;
    var isReal=false;
    try{isReal=localStorage.getItem("turnready_is_real_user")==="true";}catch(e){}
    
    // For real users with real property IDs (Supabase UUIDs contain dashes)
    if(isReal && propId && propId.includes("-")){
      // Show preview immediately using object URL
      var objectUrl=URL.createObjectURL(file);
      setProps(function(ps){return ps.map(function(p){
        if(p.id!==propId)return p;
        return Object.assign({},p,{rooms:(p.rooms||[]).map(function(r){
          if(r.id!==roomId)return r;
          return Object.assign({},r,{video:objectUrl,videoName:file.name,videoUploading:true});
        })});
      });});
      // Upload to Supabase Storage
      var path="rooms/"+propId+"/"+roomId+"/after-clean-"+Date.now()+".mp4";
      var reader2=new FileReader();
      reader2.onload=function(ev){
        uploadVideoToStorage("room-videos",path,ev.target.result,file.type||"video/mp4").then(function(publicUrl){
          setProps(function(ps){return ps.map(function(p){
            if(p.id!==propId)return p;
            return Object.assign({},p,{rooms:(p.rooms||[]).map(function(r){
              if(r.id!==roomId)return r;
              return Object.assign({},r,{video:publicUrl,videoName:file.name,videoUploading:false});
            })});
          });});
        }).catch(function(e){
          console.error("Video upload to Storage failed:",e.message);
          // Fall back to base64
          setProps(function(ps){return ps.map(function(p){
            if(p.id!==propId)return p;
            return Object.assign({},p,{rooms:(p.rooms||[]).map(function(r){
              if(r.id!==roomId)return r;
              return Object.assign({},r,{video:ev.target.result,videoName:file.name,videoUploading:false});
            })});
          });});
        });
      };
      reader2.readAsDataURL(file);
    } else {
      // Demo/local mode - use base64
      var reader=new FileReader();
      reader.onload=function(ev){
        setProps(function(ps){return ps.map(function(p){
          if(p.id!==propId)return p;
          return Object.assign({},p,{rooms:(p.rooms||[]).map(function(r){
            if(r.id!==roomId)return r;
            return Object.assign({},r,{video:ev.target.result,videoName:file.name});
          })});
        });});
      };
      reader.readAsDataURL(file);
    }
  }

  function submit(prop){
    var tasks=prop.tasks||[];
    var allTasks=tasks.every(function(t){return t.done;});
    var inventory=prop.inventory||[];
    var allInv=inventory.every(function(i){return i.cleanerStatus;});
    var rooms=prop.rooms||[];
    var allVideos=rooms.length===0||rooms.every(function(r){return r.video;});

    var resubmitMode=activeJob&&(activeJob.status==="needs_resubmit"||activeJob.isBeingResubmitted);
    if(!resubmitMode){
      if(!allTasks){alert("Please complete ALL tasks before submitting.");return;}
      if(!allInv){alert("Please check off all inventory items before submitting.");return;}
      if(!allVideos){alert("Please upload a video for every room before submitting.");return;}
    }

    var jobDuration=jobStartTime[prop.id]?Math.floor((Date.now()-jobStartTime[prop.id])/1000):0;
    var jobHrs=Math.floor(jobDuration/3600);
    var jobMins=Math.floor((jobDuration%3600)/60);
    var jobDurationStr=jobHrs>0?(jobHrs+"h "+jobMins+"m"):(jobMins+"m");
    // Check if this is a 2-cleaner job
    var mySlot2=(prop.schedule||[]).find(function(s){return s.cleanerId===user.id||s.cleanerId2===user.id;});
    var isC1=mySlot2&&mySlot2.cleanerId===user.id;
    var jobPay=mySlot2&&mySlot2.twoCleaners?(isC1?mySlot2.pay1:mySlot2.pay2):prop.pay;
    var newJob={
      id:"j"+Date.now(),propertyId:prop.id,cleanerId:user.id,
      cleanerId2:mySlot2&&mySlot2.twoCleaners?(isC1?mySlot2.cleanerId2:mySlot2.cleanerId):null,
      twoCleaners:!!(mySlot2&&mySlot2.twoCleaners),
      pay:jobPay||prop.pay,pay1:mySlot2?mySlot2.pay1:null,pay2:mySlot2?mySlot2.pay2:null,
      status:"pending_approval",completedAt:new Date().toISOString(),
      propertyName:prop.name,
      duration:jobDuration,durationStr:jobDurationStr,
      tasks:tasks,inventory:inventory,uploads:[],
      cleanerNotes:prop.cleanerNotes||"",notes:""
    };
    // If there's an existing rejected/in_progress job for this prop, update it instead of creating new
    var existingRejected=jobs.find(function(j){
      return j.propertyId===prop.id&&j.cleanerId===user.id&&(j.status==="needs_resubmit"||j.status==="in_progress");
    });
    if(existingRejected){
      setJobs(function(js){return js.map(function(j){
        return j.id!==existingRejected.id?j:Object.assign({},newJob,{id:existingRejected.id});
      });});
      // Update in Supabase if real job
      if(existingRejected.id&&existingRejected.id.includes("-")){
        updateJob(existingRejected.id,{status:"pending_approval",tasks:newJob.tasks,inventory:newJob.inventory,completed_at:newJob.completedAt,cleaner_notes:newJob.cleanerNotes,duration_seconds:newJob.duration}).catch(function(e){console.error("Job update failed:",e.message);});
      }
    } else {
      setJobs(function(js){return js.concat([newJob]);});
      // Save to Supabase
      if(user&&user.id&&user.id.includes("-")){
        var dbJob={
          property_id:prop.id&&prop.id.includes("-")?prop.id:null,
          property_name:prop.name,
          cleaner_id:user.id,
          status:"pending_approval",
          pay:newJob.pay||0,
          date:new Date().toISOString().split("T")[0],
          tasks:newJob.tasks,
          inventory:newJob.inventory,
          uploads:newJob.uploads||[],
          deep_clean:!!(prop.schedule||[]).find(function(s){return(s.cleanerId===user.id||s.cleanerId2===user.id)&&s.deepClean;}),
          duration_seconds:newJob.duration||0,
          completed_at:newJob.completedAt,
          cleaner_notes:newJob.cleanerNotes||"",
        };
        if(dbJob.property_id){
          createJob(dbJob).then(function(saved){
            if(saved&&saved.id){
              // Update local job with real DB id
              setJobs(function(js){return js.map(function(j){
                return j.id===newJob.id?Object.assign({},j,{dbId:saved.id}):j;
              });});
            }
          }).catch(function(e){console.error("Job create failed:",e.message);});
        }
      }
    }
    setProps(function(ps){return ps.map(function(p){
      if(p.id!==prop.id)return p;
      return Object.assign({},p,{
        // Mark slot complete
        schedule:(p.schedule||[]).map(function(s){
          return s.cleanerId===user.id?Object.assign({},s,{status:"complete"}):s;
        }),
        // Reset tasks so next cleaner starts fresh
        tasks:(p.tasks||[]).map(function(t){return Object.assign({},t,{done:false});}),
        inventory:(p.inventory||[]).map(function(i){return Object.assign({},i,{cleanerStatus:null});}),
        rooms:(p.rooms||[]).map(function(r){return Object.assign({},r,{video:null,preVideo:null});}),
        cleanerNotes:"",
        cleanerPhotos:[],
      });
    });});
    if(addNotification){
      addNotification({title:"Job Submitted",message:user.name+" submitted "+prop.name+" for approval",type:"job_submitted",time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})});
    }
    setShowDone(true);
  }

  if(showDone)return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",textAlign:"center",padding:20}}>
      <div style={{fontSize:64,marginBottom:20}}>✅</div>
      <div style={{fontFamily:"Arial Black,sans-serif",fontWeight:900,fontSize:24,letterSpacing:2,marginBottom:12,color:C.white}}>JOB SUBMITTED!</div>
      <div style={{color:C.muted,fontSize:14,maxWidth:340,lineHeight:1.7,marginBottom:24}}>Your manager has been notified and will review and approve your payment shortly.</div>
      <button onClick={function(){setShowDone(false);setActiveId(null);}} style={{background:C.red,border:"none",borderRadius:8,padding:"12px 24px",color:"#FFF",fontSize:13,fontWeight:900,fontFamily:"Arial Black,sans-serif",cursor:"pointer",letterSpacing:.5}}>BACK TO MY JOBS</button>
    </div>
  );

  if(activeId){
    var prop=props.find(function(p){return p.id===activeId;});
    if(!prop)return null;
    var tasks=prop.tasks||[];
    var inventory=prop.inventory||[];
    var rooms=prop.rooms||[];
    var doneTasks=tasks.filter(function(t){return t.done;}).length;
    var totalTasks=tasks.length;
    var doneInv=inventory.filter(function(i){return i.cleanerStatus;}).length;
    var doneVideos=rooms.filter(function(r){return r.video;}).length;
    var pct=totalTasks>0?Math.round((doneTasks/totalTasks)*100):0;
    // Check if this prop has an active in_progress job (e.g. after resubmit)
    var activeJob=(jobs||[]).find(function(j){return j.propertyId===prop.id&&j.cleanerId===user.id&&(j.status==="in_progress"||j.status==="needs_resubmit");});
    var isResubmit=activeJob&&(activeJob.status==="needs_resubmit"||activeJob.isBeingResubmitted);
    var started=jobStarted[prop.id]||!!(activeJob);
    var allDone=isResubmit?(doneTasks===totalTasks):(doneTasks===totalTasks&&doneInv===inventory.length&&(rooms.length===0||doneVideos===rooms.length)&&!!prop.guestRating);
    var sections=[...new Set(tasks.map(function(t){return t.section;}))];

    return(
      <div style={{fontFamily:"Inter,sans-serif",paddingBottom:100}}>
        <button onClick={function(){setActiveId(null);setActiveTab("tasks");}} style={{background:"none",border:"none",color:C.red,fontSize:13,cursor:"pointer",padding:"0 0 14px 0",fontWeight:600}}>{"← Back to My Jobs"}</button>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,letterSpacing:1,marginBottom:4}}>{prop.name}</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:16}}>{prop.address}</div>

        {/* Deep Clean Banner */}
        {(function(){
          var mySlotDC=(prop.schedule||[]).find(function(s){return (s.cleanerId===user.id||s.cleanerId2===user.id)&&s.deepClean;});
          if(!mySlotDC)return null;
          return(
            <div style={{background:"rgba(139,92,246,.12)",border:"1.5px solid rgba(139,92,246,.5)",borderRadius:10,padding:"12px 14px",marginBottom:12,display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:22,flexShrink:0}}>🧹</span>
              <div>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,color:"#8B5CF6",letterSpacing:.5,marginBottom:3}}>DEEP CLEAN JOB</div>
                <div style={{fontSize:11,color:"#CCC",lineHeight:1.6}}>This is a full deep clean. Complete the regular checklist AND the Deep Clean checklist. This resets the property to baseline standard.</div>
              </div>
            </div>
          );
        })()}

        {/* Same-Day Alert */}
        {prop.sameDay&&(
          <div style={{background:"rgba(204,0,0,.1)",border:"1px solid rgba(204,0,0,.4)",borderRadius:10,padding:"12px 14px",marginBottom:12,display:"flex",gap:10,alignItems:"flex-start"}}>
            {isResubmit&&activeJob&&(
            <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.4)",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,color:"#EF4444",letterSpacing:.5,marginBottom:4}}>🔧 FIX & RESUBMIT MODE</div>
              {activeJob.rejectReason&&<div style={{fontSize:11,color:"#EF4444",lineHeight:1.5,marginBottom:4}}><strong>Harvey said:</strong> {activeJob.rejectReason}</div>}
              <div style={{fontSize:11,color:"#888"}}>Your previous work is saved. Fix the issue and submit when ready.</div>
            </div>
          )}

          <span style={{fontSize:22,flexShrink:0}}>🔥</span>
            <div>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,color:"#CC0000",letterSpacing:.5,marginBottom:3}}>SAME-DAY TURNOVER</div>
              <div style={{fontSize:11,color:"#CCC",lineHeight:1.6}}>New guests arrive at {prop.checkIn||"4:00 PM"}. Checkout was {prop.checkOut||"11:00 AM"}. You have a tight window — prioritize speed without sacrificing quality.</div>
            </div>
          </div>
        )}

        {/* 2-Cleaner Job Banner */}
        {(function(){
          var mySlot=(prop.schedule||[]).find(function(s){return s.cleanerId===user.id||s.cleanerId2===user.id;});
          if(!mySlot||!mySlot.twoCleaners)return null;
          var partnerId=mySlot.cleanerId===user.id?mySlot.cleanerId2:mySlot.cleanerId;
          var partner=(cleaners||[]).find(function(c){return c.id===partnerId;})||{name:"Partner"};
          var myPay=mySlot.cleanerId===user.id?mySlot.pay1:mySlot.pay2;
          var mySplit=mySlot.cleanerId===user.id?mySlot.split1:mySlot.split2;
          return(
            <div style={{background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.25)",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:20,flexShrink:0}}>👥</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,color:"#3B82F6",letterSpacing:.3,marginBottom:2}}>2-CLEANER JOB</div>
                <div style={{fontSize:11,color:"#AAA"}}>Working with <span style={{color:"#FFF",fontWeight:600}}>{partner.name}</span></div>
                <div style={{fontSize:11,color:"#22C55E",fontWeight:700,marginTop:2}}>Your payout: ${(myPay||0).toFixed(0)} ({mySplit||50}%)</div>
              </div>
            </div>
          );
        })()}

        {/* Emergency / Report Problem Button */}
        {!emergencyFiled[prop.id]?(
          <button onClick={function(){setShowEmergency(true);}}
            style={{width:"100%",background:"transparent",border:"1.5px solid #EF4444",borderRadius:10,padding:"10px",color:"#EF4444",fontSize:11,fontWeight:900,fontFamily:"Arial Black,sans-serif",letterSpacing:.5,cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            🚨 REPORT A PROBLEM
          </button>
        ):(
          <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.3)",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>🚨</span>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#EF4444"}}>Problem Reported</div>
              <div style={{fontSize:10,color:"#888"}}>Manager has been notified. Continue cleaning.</div>
            </div>
          </div>
        )}

        {/* Progress + Start combined */}
        <div className="card" style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5}}>PROGRESS</div>
            <div style={{fontSize:12,fontWeight:700,color:pct===100?"#22C55E":"#F59E0B"}}>{pct}%</div>
          </div>
          <div style={{background:"#2A2A2A",borderRadius:6,height:8,marginBottom:8}}>
            <div style={{background:pct===100?"#22C55E":"#CC0000",height:8,borderRadius:6,width:(pct)+"%",transition:"width .3s"}}/>
          </div>
          <div style={{display:"flex",gap:10,fontSize:11,color:C.muted,flexWrap:"wrap",marginBottom:12}}>
            <span>{doneTasks}/{totalTasks} tasks</span>
            <span>{doneInv}/{inventory.length} inventory</span>
            <span>{doneVideos}/{rooms.length} videos</span>
          </div>
          {!started&&!isResubmit&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={function(){startJob(prop);}}
                style={{width:"100%",background:"#22C55E",border:"none",borderRadius:8,padding:"11px",color:"#FFF",
                  fontSize:12,fontWeight:900,fontFamily:"Arial Black,sans-serif",letterSpacing:.5,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <span style={{fontSize:14}}>▶</span> TAP TO BEGIN CLEANING
              </button>
              <button onClick={function(){
                var mySlot=(prop.schedule||[]).find(function(s){return s.cleanerId===user.id||s.cleanerId2===user.id;});
                setRemoveRequest({prop:prop,slot:mySlot});setRemoveReason("");setRemoveCustom("");
              }} style={{width:"100%",background:"transparent",border:"1px solid #EF4444",borderRadius:8,padding:"10px",
                color:"#EF4444",fontSize:11,fontWeight:700,fontFamily:"Arial Black,sans-serif",cursor:"pointer",letterSpacing:.3}}>
                ⚠️ REQUEST REMOVAL FROM JOB
              </button>
            </div>
          )}
          {started&&(
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(34,197,94,.1)",borderRadius:8,padding:"8px 12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{color:"#22C55E",fontSize:12,fontWeight:700}}>● IN PROGRESS</span>
              </div>
              {jobStartTime[prop.id]&&(function(){
                var elapsed=Math.floor((now-jobStartTime[prop.id])/1000);
                var hrs=Math.floor(elapsed/3600);
                var mins=Math.floor((elapsed%3600)/60);
                var secs=elapsed%60;
                var isSameDayUrgent=prop.sameDay&&elapsed>3*3600;
                return(
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,color:isSameDayUrgent?"#EF4444":"#22C55E",letterSpacing:1}}>
                      {hrs>0?(String(hrs).padStart(2,"0")+":"):""}
                      {String(mins).padStart(2,"0")}:
                      {String(secs).padStart(2,"0")}
                    </div>
                    <div style={{fontSize:9,color:"#555",marginTop:1}}>
                      {isSameDayUrgent?"⚠️ Running long":"elapsed"}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
          {["info","tasks","inventory","rooms","rating","notes"].map(function(t){
            var label=t==="info"?"ℹ️ Info":
              t==="tasks"?"Tasks ("+doneTasks+"/"+totalTasks+")":
              t==="inventory"?"Inventory ("+doneInv+"/"+inventory.length+")":
              t==="rooms"?"Rooms ("+doneVideos+"/"+rooms.length+")":
              t==="rating"?"Guest Rating "+(prop.guestRating?"✓":"!"):
              "Notes";
            return(
              <button key={t} onClick={function(){setActiveTab(t);}}
                style={{padding:"7px 14px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:11,fontWeight:700,textTransform:"capitalize",fontFamily:"Inter,sans-serif",
                  background:activeTab===t?"#CC0000":"transparent",
                  borderColor:activeTab===t?"#CC0000":t==="rating"&&!prop.guestRating?"#EF4444":"#333",
                  color:activeTab===t?"#FFF":t==="rating"&&!prop.guestRating?"#EF4444":"#888"}}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Tasks tab */}
        {/* Info Tab — read only for cleaners */}
        {activeTab==="info"&&(
          <div className="card" style={{marginBottom:14}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,marginBottom:14}}>PROPERTY DETAILS</div>

            {/* Address */}
            <div style={{padding:"9px 0",borderBottom:"1px solid #1A1A1A"}}>
              <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Address</div>
              {prop.address?(
                <div onClick={function(){window.open("https://maps.google.com/?q="+encodeURIComponent(prop.address),"_blank");}}
                  style={{fontSize:13,fontWeight:500,color:"#CC0000",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                  {prop.address} 🗺️
                </div>
              ):<div style={{fontSize:13,color:"#555"}}>—</div>}
            </div>

            {/* Property Type */}
            {prop.type&&(
              <div style={{padding:"9px 0",borderBottom:"1px solid #1A1A1A"}}>
                <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Property Type</div>
                <div style={{fontSize:13,fontWeight:500}}>{prop.type}</div>
              </div>
            )}

            {/* Bedrooms / Bathrooms */}
            <div style={{padding:"9px 0",borderBottom:"1px solid #1A1A1A"}}>
              <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Bedrooms / Bathrooms</div>
              <div style={{fontSize:13,fontWeight:500}}>{prop.bedrooms||"—"} bed / {prop.bathrooms%1===0.5?Math.floor(prop.bathrooms)+"½":prop.bathrooms||"—"} bath</div>
            </div>

            {/* Total Beds */}
            <div style={{padding:"9px 0",borderBottom:"1px solid #1A1A1A"}}>
              <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Total Beds (Mattresses)</div>
              <div style={{fontSize:13,fontWeight:500}}>{prop.totalBeds?prop.totalBeds+" beds total":"—"}</div>
            </div>

            {/* Check Out / Check In */}
            <div style={{padding:"9px 0",borderBottom:"1px solid #1A1A1A"}}>
              <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Check Out / Check In</div>
              <div style={{fontSize:13,fontWeight:500}}>Check Out: {prop.checkOut||"11:00 AM"} · Check In: {prop.checkIn||"4:00 PM"}</div>
            </div>

            {/* Pay */}
            <div style={{padding:"9px 0",borderBottom:"1px solid #1A1A1A"}}>
              <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Pay / Job</div>
              <div style={{fontSize:13,fontWeight:500,color:"#CC0000"}}>${prop.pay||"—"}.00</div>
            </div>

            {/* 🔒 ACCESS & SECURITY */}
            <div style={{padding:"10px 0 4px",marginTop:4}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:10,fontWeight:900,color:"#CC0000",letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>🔒 ACCESS &amp; SECURITY</div>
            </div>

            {/* Access Code */}
            <div style={{padding:"9px 0",borderBottom:"1px solid #1A1A1A"}}>
              <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Property Access Code</div>
              <div style={{fontSize:15,fontWeight:900,fontFamily:"Arial Black,sans-serif",color:"#FFF",letterSpacing:2}}>{prop.accessCode||"—"}</div>
            </div>

            {/* Supply Closet */}
            <div style={{padding:"9px 0",borderBottom:"1px solid #1A1A1A"}}>
              <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Supply Closet / Code &amp; Location</div>
              <div style={{fontSize:13,fontWeight:500}}>{prop.supplyInfo||"—"}</div>
            </div>

            {/* Alarm Code */}
            <div style={{padding:"9px 0",borderBottom:"1px solid #1A1A1A"}}>
              <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Alarm Code</div>
              <div style={{fontSize:15,fontWeight:900,fontFamily:"Arial Black,sans-serif",color:"#EF4444",letterSpacing:2}}>{prop.alarmCode||"—"}</div>
              {prop.alarmCode&&<div style={{fontSize:10,color:"#888",marginTop:4}}>Disarm immediately upon entry</div>}
            </div>

            {/* Notes */}
            {prop.notes&&(
              <div style={{padding:"9px 0"}}>
                <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.3,marginBottom:4}}>Notes</div>
                <div style={{fontSize:13,color:"#CCC",lineHeight:1.6}}>{prop.notes}</div>
              </div>
            )}
          </div>
        )}

        {activeTab==="tasks"&&(
          <div className="card" style={{marginBottom:14}}>
            {sections.map(function(sec){
              return(
                <div key={sec} style={{marginBottom:8}}>
                  <div style={{fontSize:13,color:"#CC0000",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8,fontWeight:900,fontFamily:"Arial Black,sans-serif",paddingTop:8}}>— {sec}</div>
                  {tasks.filter(function(t){return t.section===sec;}).map(function(t){
                    return(
                      <div key={t.id} onClick={function(){if(started)toggleTask(prop.id,t.id);}}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #1A1A1A",cursor:started?"pointer":"not-allowed",opacity:started?1:.6}}>
                        <div style={{width:22,height:22,borderRadius:5,flexShrink:0,
                          border:"2px solid "+(t.done?"#22C55E":"#444"),
                          background:t.done?"#22C55E":"transparent",
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {t.done&&<span style={{color:"#FFF",fontSize:12,fontWeight:900}}>✓</span>}
                        </div>
                        <span style={{fontSize:13,color:t.done?C.muted:C.white,textDecoration:t.done?"line-through":"none",flex:1,wordBreak:"break-word",overflowWrap:"break-word",minWidth:0}}>{t.label}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {!started&&<div style={{fontSize:11,color:C.muted,textAlign:"center",paddingTop:8}}>Start the job to check off tasks</div>}
          </div>
        )}

        {/* Inventory tab */}
        {activeTab==="inventory"&&(
          <div className="card" style={{marginBottom:14}}>
            {isResubmit&&(
              <div style={{fontSize:11,color:"#888",background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:6,padding:"6px 10px",marginBottom:10}}>
                📦 Showing your previously submitted inventory. Update any items that changed.
              </div>
            )}
            {inventory.map(function(inv){
              var cur=inv.cleanerStatus;
              return(
                <div key={inv.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #222"}}>
                  <div style={{flex:1,fontSize:13}}>{inv.item}</div>
                  <div style={{display:"flex",gap:6}}>
                    {["full","med","low"].map(function(lvl){
                      var colors={full:"#22C55E",med:"#F59E0B",low:"#EF4444"};
                      var labels={full:"Full",med:"Med",low:"Low"};
                      var active=cur===lvl;
                      return(
                        <button key={lvl} onClick={function(){if(started)updateInv(prop.id,inv.id,lvl);}}
                          disabled={!started}
                          style={{padding:"4px 10px",borderRadius:6,border:"none",cursor:started?"pointer":"not-allowed",
                            background:active?colors[lvl]:"#2A2A2A",
                            color:active?"#FFF":colors[lvl],
                            fontSize:11,fontWeight:700,opacity:started?1:.6}}>
                          {labels[lvl]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {!started&&<div style={{fontSize:11,color:C.muted,textAlign:"center",paddingTop:8}}>Start the job to update inventory</div>}
          </div>
        )}
        {/* Rooms tab */}
        {activeTab==="rooms"&&(
          <div style={{marginBottom:14}}>
            {(prop.rooms||[]).map(function(room){
              return(
                <div key={room.id} className="card" style={{marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:22}}>{room.icon||"🏠"}</span>
                      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,letterSpacing:.5}}>{room.name}</div>
                    </div>
                    {room.video?(
                    <span style={{background:"rgba(34,197,94,.15)",border:"1px solid rgba(34,197,94,.4)",borderRadius:6,padding:"2px 8px",color:"#22C55E",fontSize:10,fontWeight:700}}>✓ VIDEO DONE</span>
                  ):(
                    <span style={{background:"rgba(204,0,0,.1)",border:"1px solid rgba(204,0,0,.3)",borderRadius:6,padding:"2px 8px",color:"#888",fontSize:10,fontWeight:700}}>📹 NEEDS VIDEO</span>
                  )}
                  </div>
                  {room.guide&&(
                    <div style={{background:C.surface,borderRadius:8,padding:12,marginBottom:12}}>
                      <div style={{fontSize:10,color:C.red,fontWeight:700,letterSpacing:.5,marginBottom:6,textTransform:"uppercase"}}>📋 How to stage this room</div>
                      <div style={{fontSize:12,color:C.offWhite,lineHeight:1.7}}>{room.guide}</div>
                    </div>
                  )}
                  {((room.refPhotos&&room.refPhotos.length>0)||room.refVideo)&&(
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:10,color:C.red,fontWeight:700,letterSpacing:.5,marginBottom:8,textTransform:"uppercase"}}>📸 Reference — This is how it should look</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {(room.refPhotos||[]).map(function(ph,i){
                          return <img key={i} src={ph} alt={"ref "+(i+1)} 
                            onClick={function(){
                              var overlay=document.createElement("div");
                              overlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:9999;display:flex;align-items:center;justify-content:center;";
                              overlay.onclick=function(){document.body.removeChild(overlay);};
                              var img=document.createElement("img");
                              img.src=ph;
                              img.style.cssText="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px;";
                              var close=document.createElement("button");
                              close.textContent="✕";
                              close.style.cssText="position:absolute;top:16px;right:16px;background:rgba(255,255,255,.2);border:none;color:#FFF;font-size:20px;width:36px;height:36px;border-radius:50%;cursor:pointer;";
                              close.onclick=function(){document.body.removeChild(overlay);};
                              overlay.appendChild(img);
                              overlay.appendChild(close);
                              document.body.appendChild(overlay);
                            }}
                            style={{width:90,height:90,borderRadius:8,objectFit:"cover",flexShrink:0,cursor:"pointer"}}/>;
                        })}
                        {room.refVideo&&<video src={room.refVideo} controls style={{width:90,height:90,borderRadius:8,objectFit:"cover",flexShrink:0}}/>}
                      </div>
                    </div>
                  )}
                  {/* Pre-clean video */}
                  <div style={{borderTop:"1px solid #2A2A2A",marginBottom:12}}/>
                  <div style={{fontSize:10,color:"#F59E0B",fontWeight:700,letterSpacing:.5,marginBottom:6,textTransform:"uppercase"}}>📹 Pre-Clean Video <span style={{fontWeight:400,color:"#666"}}>(Optional — strongly recommended)</span></div>
                  <div style={{fontSize:11,color:"#888",lineHeight:1.5,marginBottom:8}}>Record the room condition on arrival. This protects you if guests dispute damage.</div>
                  {room.preVideo&&(
                    <div style={{position:"relative",marginBottom:8}}>
                      <video src={room.preVideo} controls style={{width:"100%",borderRadius:8,maxHeight:180}}/>
                      <button onClick={function(){setProps(function(ps){return ps.map(function(pp){
                        if(pp.id!==prop.id)return pp;
                        return Object.assign({},pp,{rooms:(pp.rooms||[]).map(function(rm){return rm.id!==room.id?rm:Object.assign({},rm,{preVideo:null});})});
                      });});}}
                        style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.7)",border:"none",borderRadius:6,color:"#FFF",fontSize:11,padding:"4px 8px",cursor:"pointer"}}>✕ Remove</button>
                    </div>
                  )}
                  {!room.preVideo&&(
                    <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                      background:"rgba(245,158,11,.1)",border:"1.5px dashed #F59E0B",
                      borderRadius:8,padding:"10px",cursor:"pointer",marginBottom:12}}>
                      <span style={{fontSize:16}}>📹</span>
                      <span style={{fontSize:12,fontWeight:600,color:"#F59E0B"}}>Upload Pre-Clean Video</span>
                      <input type="file" accept="video/*" capture="environment" style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                        onChange={function(e){
                          var file=e.target.files[0];if(!file)return;
                          var reader=new FileReader();
                          reader.onload=function(ev){setProps(function(ps){return ps.map(function(pp){
                            if(pp.id!==prop.id)return pp;
                            return Object.assign({},pp,{rooms:(pp.rooms||[]).map(function(rm){return rm.id!==room.id?rm:Object.assign({},rm,{preVideo:ev.target.result});})});
                          });});};
                          reader.readAsDataURL(file);
                        }}/>
                    </label>
                  )}

                  <div style={{borderTop:"1px solid #2A2A2A",marginBottom:12}}/>
                  <div style={{fontSize:10,color:"#888",fontWeight:700,letterSpacing:.5,marginBottom:8,textTransform:"uppercase"}}>🎥 Your After-Clean Video (Required)</div>
                  {room.video&&(
                    <div style={{marginBottom:10,position:"relative"}}>
                      <video src={room.video} controls style={{width:"100%",borderRadius:8,maxHeight:200}}/>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                        <div style={{fontSize:11,color:"#22C55E",fontWeight:600}}>✓ {room.videoName||"Video uploaded"}</div>
                        <button onClick={function(){setProps(function(ps){return ps.map(function(pp){
                          if(pp.id!==prop.id)return pp;
                          return Object.assign({},pp,{rooms:(pp.rooms||[]).map(function(rm){return rm.id!==room.id?rm:Object.assign({},rm,{video:null,videoName:null});})});
                        });});}}
                          style={{background:"transparent",border:"1px solid #EF4444",borderRadius:6,color:"#EF4444",fontSize:10,padding:"3px 8px",cursor:"pointer"}}>✕ Remove</button>
                      </div>
                    </div>
                  )}
                  {!room.video&&(
                  <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,
                    background:"rgba(204,0,0,.1)",
                    border:"1.5px dashed #CC0000",
                    borderRadius:10,padding:"18px 14px",cursor:started?"pointer":"not-allowed",
                    opacity:started?1:.5,marginBottom:4}}>
                    <span style={{fontSize:32}}>🎬</span>
                    <span style={{fontSize:13,fontWeight:900,fontFamily:"Arial Black,sans-serif",
                      color:"#CC0000",letterSpacing:.3}}>TAP TO RECORD OR UPLOAD</span>
                    <span style={{fontSize:11,color:"#888"}}>Record a video after cleaning this room</span>
                    <input type="file" accept="video/*" capture="environment" disabled={!started}
                      style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                      onChange={function(e){
                        var file=e.target.files[0];if(!file)return;
                        uploadRoomVideo(prop.id,room.id,file);
                        setProps(function(ps){return ps.map(function(pp){
                          if(pp.id!==prop.id)return pp;
                          return Object.assign({},pp,{rooms:(pp.rooms||[]).map(function(rm){
                            return rm.id!==room.id?rm:Object.assign({},rm,{videoName:file.name});
                          })});
                        });});
                      }}/>
                  </label>
                  )}
                  {!room.video&&started&&(
                  <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                    background:"#1A1A1A",border:"1px solid #333",
                    borderRadius:10,padding:"10px 14px",cursor:"pointer",marginTop:6}}>
                    <span style={{fontSize:16}}>📁</span>
                    <span style={{fontSize:12,fontWeight:600,color:"#888"}}>Or upload from gallery</span>
                    <input type="file" accept="video/*" disabled={!started}
                      style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                      onChange={function(e){
                        var file=e.target.files[0];if(!file)return;
                        uploadRoomVideo(prop.id,room.id,file);
                        setProps(function(ps){return ps.map(function(pp){
                          if(pp.id!==prop.id)return pp;
                          return Object.assign({},pp,{rooms:(pp.rooms||[]).map(function(rm){
                            return rm.id!==room.id?rm:Object.assign({},rm,{videoName:file.name});
                          })});
                        });});
                      }}/>
                  </label>
                  )}
                  {!started&&<div style={{fontSize:10,color:C.muted,textAlign:"center",marginTop:6}}>Start the job first to upload</div>}
                </div>
              );
            })}
          </div>
        )}
        {/* Rating tab */}
        {activeTab==="rating"&&(
          <div className="card" style={{marginBottom:14}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,marginBottom:4}}>GUEST CONDITION RATING</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Rate the condition you found the property in</div>
            <div style={{fontSize:11,color:"#F59E0B",fontWeight:700,marginBottom:14}}>⚠️ Required before submitting for payment</div>
            {[
              {stars:5,label:"Excellent",emoji:"⭐⭐⭐⭐⭐",desc:"Minimal trash. Light bed use. No heavy mess."},
              {stars:4,label:"Normal Stay",emoji:"⭐⭐⭐⭐",desc:"Trash present. Minor crumbs. Normal use."},
              {stars:3,label:"Moderate Mess",emoji:"⭐⭐⭐",desc:"Noticeable food residue. Hair buildup. Light stains."},
              {stars:2,label:"Heavy Turnover",emoji:"⭐⭐",desc:"Spills. Multiple stains. Strong odors. Excess trash."},
              {stars:1,label:"Problem Condition",emoji:"⭐",desc:"Damage. Missing items. Party signs. Severe odor."},
            ].map(function(r){
              var selected=prop.guestRating===r.stars;
              return(
                <div key={r.stars} onClick={function(){
                  if(!started)return;
                  setProps(function(ps){return ps.map(function(p){
                    return p.id!==prop.id?p:Object.assign({},p,{guestRating:r.stars});
                  });});
                }} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:"1px solid #222",cursor:started?"pointer":"not-allowed",
                  background:selected?"rgba(245,158,11,.08)":"transparent",borderRadius:selected?8:0,
                  opacity:!started?0.5:1}}>
                  <div style={{width:24,height:24,borderRadius:6,flexShrink:0,marginTop:2,
                    border:"2px solid "+(selected?"#F59E0B":"#444"),
                    background:selected?"#F59E0B":"transparent",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {selected&&<span style={{color:"#FFF",fontSize:13,fontWeight:900}}>✓</span>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:700,color:selected?"#F59E0B":"#FFF"}}>{r.label}</span>
                      <span style={{fontSize:12}}>{r.emoji}</span>
                    </div>
                    <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{r.desc}</div>
                    {r.stars===1&&<div style={{fontSize:11,color:"#EF4444",fontWeight:700,marginTop:6}}>⚠️ Stop and call your host/manager right away!</div>}
                  </div>
                </div>
              );
            })}
            {!started&&<div style={{fontSize:11,color:C.muted,textAlign:"center",paddingTop:8}}>Start the job first to submit rating</div>}
          </div>
        )}

        {/* Notes tab */}
        {activeTab==="notes"&&(
          <div style={{marginBottom:14}}>
            {/* Manager notes - read only */}
            {prop.managerNotes&&(
              <div className="card" style={{marginBottom:12}}>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:8,color:C.red}}>📋 MANAGER NOTES FOR YOU</div>
                <div style={{fontSize:13,color:C.offWhite,lineHeight:1.7,background:"rgba(204,0,0,.06)",borderRadius:8,padding:"10px 12px"}}>{prop.managerNotes}</div>
              </div>
            )}
            {!prop.managerNotes&&(
              <div className="card" style={{marginBottom:12,textAlign:"center",padding:20,color:C.muted}}>
                <div style={{fontSize:20,marginBottom:6}}>📋</div>
                <div style={{fontSize:12}}>No manager notes for this cleaning</div>
              </div>
            )}
            {/* Cleaner notes to manager */}
            <div className="card">
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:4,color:"#22C55E"}}>🧹 YOUR NOTES TO MANAGER</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:10}}>Leave notes about the property — separate from condition rating</div>
              <textarea
                value={prop.cleanerNotes||""}
                onChange={function(e){
                  if(!started)return;
                  setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{cleanerNotes:e.target.value});});});
                }}
                placeholder={started?"e.g. Found crack in bathroom mirror. Back door doesn't lock properly. Washer needs repair...":"Start the job first to add notes"}
                rows={4}
                style={{width:"100%",background:"#1A1A1A",border:"1px solid "+(started?"#2A2A2A":"#111"),borderRadius:8,color:started?"#FFF":"#555",fontSize:12,padding:"10px 12px",outline:"none",resize:"vertical",fontFamily:"Inter,sans-serif",lineHeight:1.6,boxSizing:"border-box",opacity:started?1:.6}}/>
              {/* Linen Bags Section */}
              <div style={{marginBottom:16,background:"rgba(59,130,246,.06)",border:"1px solid rgba(59,130,246,.2)",borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,color:"#3B82F6",letterSpacing:.5,marginBottom:4}}>🛍️ LINEN BAGS TAKEN HOME</div>
                <div style={{fontSize:11,color:"#888",marginBottom:10,lineHeight:1.5}}>Enter how many bags of linens you are taking home. Upload a photo or video as proof.</div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <button onClick={function(){if(!started)return;var cur=prop.linenBags||0;if(cur>0)setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{linenBags:cur-1});});});}}
                    style={{width:36,height:36,borderRadius:"50%",background:"#1A1A1A",border:"1px solid #333",color:"#FFF",fontSize:20,cursor:started?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>−</button>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:28,fontWeight:900,color:"#3B82F6"}}>{prop.linenBags||0}</div>
                    <div style={{fontSize:10,color:"#888"}}>bag{(prop.linenBags||0)!==1?"s":""}</div>
                  </div>
                  <button onClick={function(){if(!started)return;var cur=prop.linenBags||0;setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{linenBags:cur+1});});});}}
                    style={{width:36,height:36,borderRadius:"50%",background:"#3B82F6",border:"none",color:"#FFF",fontSize:20,cursor:started?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>+</button>
                </div>
                {(prop.linenBags||0)>0&&(
                  <div style={{marginTop:6}}>
                    <div style={{fontSize:10,color:"#888",marginBottom:6}}>Upload proof photo/video of the bags:</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                      {(prop.linenBagPhotos||[]).map(function(ph,i){
                        var isVid=ph.startsWith("data:video");
                        function openFull(){
                          var ov=document.createElement("div");
                          ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.96);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:16px;";
                          ov.onclick=function(e){if(e.target===ov)document.body.removeChild(ov);};
                          if(isVid){var vid=document.createElement("video");vid.src=ph;vid.controls=true;vid.autoplay=true;vid.playsInline=true;vid.style.cssText="max-width:95vw;max-height:80vh;border-radius:8px;";ov.appendChild(vid);}
                          else{var img=document.createElement("img");img.src=ph;img.style.cssText="max-width:95vw;max-height:80vh;object-fit:contain;border-radius:8px;";ov.appendChild(img);}
                          var cl=document.createElement("button");cl.textContent="✕ Close";
                          cl.style.cssText="margin-top:12px;background:rgba(255,255,255,.2);border:none;color:#FFF;font-size:14px;padding:10px 24px;border-radius:20px;cursor:pointer;";
                          cl.onclick=function(){document.body.removeChild(ov);};
                          ov.appendChild(cl);document.body.appendChild(ov);
                        }
                        return(
                          <div key={i} style={{position:"relative",flexShrink:0,cursor:"pointer"}} onClick={openFull}>
                            {isVid?(
                              <div style={{width:70,height:70,borderRadius:6,overflow:"hidden",position:"relative"}}>
                                <video src={ph} style={{width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}}/>
                                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.3)"}}>
                                  <span style={{fontSize:16,color:"#FFF"}}>▶</span>
                                </div>
                              </div>
                            ):(
                              <img src={ph} style={{width:70,height:70,borderRadius:6,objectFit:"cover",pointerEvents:"none"}}/>
                            )}
                            <button onClick={function(e){e.stopPropagation();setProps(function(ps){return ps.map(function(p){if(p.id!==prop.id)return p;var ph2=(p.linenBagPhotos||[]).filter(function(_,j){return j!==i;});return Object.assign({},p,{linenBagPhotos:ph2});});});}}
                              style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"#EF4444",border:"none",color:"#FFF",fontSize:9,cursor:"pointer",fontWeight:900}}>×</button>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <label style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,background:"transparent",border:"1px dashed #3B82F6",borderRadius:6,padding:"6px",cursor:started?"pointer":"not-allowed",fontSize:10,color:"#3B82F6",opacity:started?1:.5}}>
                        📸 Photo
                        <input type="file" accept="image/*" capture="environment" disabled={!started} style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                          onChange={function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){compressImage(ev.target.result,1200,1200,0.75,function(compressed){setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{linenBagPhotos:(p.linenBagPhotos||[]).concat([compressed])});});});});};r.readAsDataURL(f);}}/>
                      </label>
                      <label style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,background:"transparent",border:"1px dashed #3B82F6",borderRadius:6,padding:"6px",cursor:started?"pointer":"not-allowed",fontSize:10,color:"#3B82F6",opacity:started?1:.5}}>
                        🎬 Video
                        <input type="file" accept="video/*" capture="environment" disabled={!started} style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                          onChange={function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){compressImage(ev.target.result,1200,1200,0.75,function(compressed){setProps(function(ps){return ps.map(function(p){return p.id!==prop.id?p:Object.assign({},p,{linenBagPhotos:(p.linenBagPhotos||[]).concat([compressed])});});});});};r.readAsDataURL(f);}}/>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Photo upload */}
              <div style={{marginTop:12}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:8}}>PROPERTY PHOTOS (optional)</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                  {(prop.cleanerPhotos||[]).map(function(ph,i){
                    return(
                      <div key={i} style={{position:"relative",flexShrink:0,cursor:"pointer"}} onClick={function(){
                        var ov=document.createElement("div");
                        ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.96);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:16px;";
                        ov.onclick=function(e){if(e.target===ov)document.body.removeChild(ov);};
                        var img=document.createElement("img");img.src=ph;
                        img.style.cssText="max-width:95vw;max-height:80vh;object-fit:contain;border-radius:8px;";
                        ov.appendChild(img);
                        var cl=document.createElement("button");cl.textContent="✕ Close";
                        cl.style.cssText="margin-top:12px;background:rgba(255,255,255,.2);border:none;color:#FFF;font-size:14px;padding:10px 24px;border-radius:20px;cursor:pointer;";
                        cl.onclick=function(){document.body.removeChild(ov);};
                        ov.appendChild(cl);document.body.appendChild(ov);
                      }}>
                        <img src={ph} alt={"photo "+(i+1)} style={{width:80,height:80,borderRadius:8,objectFit:"cover",pointerEvents:"none"}}/>
                        <button onClick={function(e){
                          e.stopPropagation();
                          setProps(function(ps){return ps.map(function(p){
                            if(p.id!==prop.id)return p;
                            var photos=(p.cleanerPhotos||[]).filter(function(_,j){return j!==i;});
                            return Object.assign({},p,{cleanerPhotos:photos});
                          });});
                        }} style={{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:"50%",background:"#EF4444",border:"none",color:"#FFF",fontSize:10,cursor:"pointer",fontWeight:900}}>×</button>
                      </div>
                    );
                  })}
                </div>
                <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:"transparent",border:"1px dashed #444",borderRadius:8,padding:"9px",cursor:started?"pointer":"not-allowed",opacity:started?1:.5,color:"#888",fontSize:11,fontWeight:700}}>
                  📸 ADD PHOTO
                  <input type="file" accept="image/*" multiple disabled={!started}
                    style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                    onChange={function(e){
                      var files=Array.from(e.target.files);
                      files.forEach(function(file){
                        var reader=new FileReader();
                        reader.onload=function(ev){
                          setProps(function(ps){return ps.map(function(p){
                            if(p.id!==prop.id)return p;
                            return Object.assign({},p,{cleanerPhotos:(p.cleanerPhotos||[]).concat([ev.target.result])});
                          });});
                        };
                        reader.readAsDataURL(file);
                      });
                    }}/>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Report Modal */}
        {showEmergency&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:400,display:"flex",alignItems:"flex-end"}}>
            <div style={{background:"#141414",borderRadius:"16px 16px 0 0",width:"100%",padding:20,maxHeight:"85vh",overflowY:"auto",border:"2px solid #EF4444"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <span style={{fontSize:24}}>🚨</span>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,letterSpacing:.5,color:"#EF4444"}}>REPORT A PROBLEM</div>
              </div>
              <div style={{fontSize:12,color:"#888",marginBottom:16,lineHeight:1.6}}>Your manager will be notified immediately. Be as specific as possible.</div>

              {/* Problem type */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>What type of problem?</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {[
                    {id:"damage",icon:"💔",label:"Property Damage",desc:"Broken furniture, appliances, holes, stains"},
                    {id:"missing",icon:"❓",label:"Missing Items",desc:"Electronics, decor, supplies missing"},
                    {id:"odor",icon:"💨",label:"Strong Odor / Smoke",desc:"Cigarette, cannabis, pet, or other strong smells"},
                    {id:"biohazard",icon:"⚠️",label:"Biohazard / Unsafe",desc:"Blood, bodily fluids, needles, unsafe conditions"},
                    {id:"pest",icon:"🐛",label:"Pest / Infestation",desc:"Bugs, rodents, or signs of infestation"},
                    {id:"party",icon:"🎉",label:"Party / Excessive Mess",desc:"Clear signs of unauthorized party or event"},
                    {id:"other",icon:"📋",label:"Other Issue",desc:"Something not listed above"},
                  ].map(function(type){return(
                    <button key={type.id} onClick={function(){setEmergencyType(type.id);}}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"1.5px solid "+(emergencyType===type.id?"#EF4444":"#2A2A2A"),background:emergencyType===type.id?"rgba(239,68,68,.1)":"transparent",cursor:"pointer",textAlign:"left"}}>
                      <span style={{fontSize:20,flexShrink:0}}>{type.icon}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:emergencyType===type.id?"#EF4444":"#FFF"}}>{type.label}</div>
                        <div style={{fontSize:10,color:"#666"}}>{type.desc}</div>
                      </div>
                      {emergencyType===type.id&&<span style={{marginLeft:"auto",color:"#EF4444",fontSize:16}}>✓</span>}
                    </button>
                  );})}
                </div>
              </div>

              {/* Details */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Describe the issue</div>
                <textarea value={emergencyNote} onChange={function(e){setEmergencyNote(e.target.value);}}
                  placeholder="e.g. Found a large crack in the bathroom mirror and a cigarette burn on the living room couch..."
                  rows={3}
                  style={{width:"100%",background:"#1A1A1A",border:"1px solid #333",borderRadius:8,color:"#FFF",fontSize:12,padding:"10px 12px",outline:"none",resize:"none",fontFamily:"Inter,sans-serif",lineHeight:1.6,boxSizing:"border-box"}}/>
              </div>

              <div style={{display:"flex",gap:8}}>
                <button onClick={function(){
                  if(!emergencyType)return;
                  var types={damage:"💔 Property Damage",missing:"❓ Missing Items",odor:"💨 Strong Odor",biohazard:"⚠️ Biohazard",pest:"🐛 Pest Issue",party:"🎉 Party/Excessive Mess",other:"📋 Other Issue"};
                  var label=types[emergencyType]||"Issue";
                  addNotification&&addNotification({
                    type:"emergency",
                    icon:"🚨",
                    title:"EMERGENCY: "+label,
                    body:user.name+" reported a problem at "+prop.name+(emergencyNote?" — "+emergencyNote.slice(0,60):""),
                    forRole:"manager",
                    navTo:"Properties",
                    time:new Date().toISOString(),
                    read:false
                  });
                  setEmergencyFiled(function(prev){var u=Object.assign({},prev);u[prop.id]=true;return u;});
                  setShowEmergency(false);
                  setEmergencyNote("");
                  setEmergencyType("");
                }} disabled={!emergencyType}
                  style={{flex:2,background:emergencyType?"#EF4444":"#2A2A2A",border:"none",borderRadius:8,color:emergencyType?"#FFF":"#555",fontSize:12,fontWeight:900,padding:"12px",cursor:emergencyType?"pointer":"default",fontFamily:"Arial Black,sans-serif",letterSpacing:.5}}>
                  🚨 SEND ALERT TO MANAGER
                </button>
                <button onClick={function(){setShowEmergency(false);setEmergencyNote("");setEmergencyType("");}}
                  style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:8,color:"#888",fontSize:12,padding:"12px",cursor:"pointer"}}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Submit button */}
        <div style={{position:"fixed",bottom:64,left:0,right:0,padding:"0 16px",zIndex:50}}>
          {isResubmit?(
            <button onClick={function(){submit(prop);}}
              style={{width:"100%",background:"#CC0000",border:"none",borderRadius:8,padding:"14px",
                color:"#FFF",fontSize:13,fontWeight:900,fontFamily:"Arial Black,sans-serif",
                letterSpacing:.5,cursor:"pointer",
                boxShadow:"0 4px 20px rgba(204,0,0,.4)"}}>
              ✓ RESUBMIT JOB TO HARVEY
            </button>
          ):(
            <button onClick={function(){if(started)submit(prop);}}
              disabled={!started||!allDone}
              style={{width:"100%",background:allDone&&started?"#CC0000":"#2A2A2A",border:"none",borderRadius:8,padding:"11px",
                color:allDone&&started?"#FFF":"#555",fontSize:12,fontWeight:900,fontFamily:"Arial Black,sans-serif",
                letterSpacing:.5,cursor:allDone&&started?"pointer":"not-allowed",
                boxShadow:allDone&&started?"0 4px 20px rgba(204,0,0,.4)":"none"}}>
              {!started?"START JOB FIRST":!allDone?"COMPLETE ALL TASKS, INVENTORY, VIDEOS & RATING":"COMPLETE AND SUBMIT FOR APPROVAL"}
            </button>
          )}
        </div>
      {/* Remove from Job Modal */}
      {removeRequest&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:400,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#141414",borderRadius:"16px 16px 0 0",width:"100%",padding:24,fontFamily:"Inter,sans-serif",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,letterSpacing:.5,color:"#EF4444",marginBottom:4}}>⚠️ REQUEST JOB REMOVAL</div>
            <div style={{fontSize:12,color:"#888",marginBottom:12}}>{removeRequest.prop.name} · {removeRequest.slot&&removeRequest.slot.date}</div>
            <div style={{fontSize:11,color:"#888",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"8px 12px",marginBottom:14,lineHeight:1.6}}>You remain responsible until Harvey confirms your removal.</div>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,letterSpacing:.5,marginBottom:10}}>SELECT A REASON</div>
            {["Personal emergency","Family emergency","Medical / health issue","Transportation issue","Double booked by mistake","Property too far from my location","Other (explain below)"].map(function(reason){return(
              <div key={reason} onClick={function(){setRemoveReason(reason);}}
                style={{padding:"10px 14px",borderRadius:8,marginBottom:6,cursor:"pointer",
                  background:removeReason===reason?"rgba(239,68,68,.12)":"#1A1A1A",
                  border:"1px solid "+(removeReason===reason?"#EF4444":"#2A2A2A"),
                  color:removeReason===reason?"#FFF":"#888",fontSize:12,fontWeight:removeReason===reason?700:400,
                  display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:16,height:16,borderRadius:"50%",border:"2px solid "+(removeReason===reason?"#EF4444":"#444"),background:removeReason===reason?"#EF4444":"transparent",flexShrink:0}}/>
                {reason}
              </div>
            );})}
            <textarea value={removeCustom} onChange={function(e){setRemoveCustom(e.target.value);}}
              placeholder="Additional details (optional)..." rows={2}
              style={{width:"100%",background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:8,color:"#FFF",fontSize:12,padding:"8px 12px",outline:"none",resize:"none",marginTop:8,marginBottom:14,fontFamily:"Inter,sans-serif",boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){setRemoveRequest(null);setRemoveReason("");setRemoveCustom("");}}
                style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:8,padding:"11px",color:"#888",fontSize:12,cursor:"pointer"}}>Cancel</button>
              <button onClick={function(){
                if(!removeReason)return;
                var fullReason=removeCustom.trim()?removeReason+" — "+removeCustom.trim():removeReason;
                if(addNotification){addNotification({type:"removal_request",icon:"⚠️",title:"Removal Request — "+user.name,
                  body:user.name+" is requesting removal from "+removeRequest.prop.name+" on "+(removeRequest.slot&&removeRequest.slot.date)+". Reason: "+fullReason,
                  forRole:"manager",navTo:"Approvals",time:new Date().toISOString(),read:false});}
                // Add to pendingRemovals list directly - more reliable than slot flags
                if(setPendingRemovals){
                  setPendingRemovals(function(prev){
                    // avoid duplicates
                    var existing=prev.filter(function(r){return !(r.propId===removeRequest.prop.id&&r.slotId===(removeRequest.slot&&removeRequest.slot.id));});
                    return existing.concat([{
                      id:"rem"+Date.now(),
                      propId:removeRequest.prop.id,
                      propName:removeRequest.prop.name,
                      slotId:removeRequest.slot&&removeRequest.slot.id,
                      slotDate:removeRequest.slot&&removeRequest.slot.date,
                      slotTime:removeRequest.slot&&removeRequest.slot.time,
                      cleanerId:user.id,
                      cleanerName:user.name,
                      reason:fullReason,
                      time:new Date().toISOString()
                    }]);
                  });
                }
                setRemoveRequest(null);setRemoveReason("");setRemoveCustom("");
              }} style={{flex:2,background:removeReason?"#EF4444":"#2A2A2A",border:"none",borderRadius:8,padding:"11px",
                color:removeReason?"#FFF":"#555",fontSize:12,fontWeight:900,fontFamily:"Arial Black,sans-serif",
                cursor:removeReason?"pointer":"default",letterSpacing:.3}}>SEND REQUEST</button>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }

  return(
    <div style={{fontFamily:"Inter,sans-serif"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1}}>MY JOBS</div>
      </div>
      {/* Active / History tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[["active","🧹 Active"],["history","📋 History"]].map(function(t){return(
          <button key={t[0]} onClick={function(){setJobsTab(t[0]);setSelectedHistory(null);}}
            style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"Arial Black,sans-serif",
              background:jobsTab===t[0]?"#CC0000":"transparent",
              borderColor:jobsTab===t[0]?"#CC0000":"#333",
              color:jobsTab===t[0]?"#FFF":C.muted}}>
            {t[1]}
          </button>
        );})}
      </div>

      {/* History view */}
      {jobsTab==="history"&&(function(){
        var pastJobs=(jobs||[]).filter(function(j){
          return (j.cleanerId===user.id||j.cleanerId2===user.id)&&(j.status==="approved"||j.status==="pending_approval");
        }).sort(function(a,b){return new Date(b.completedAt)-new Date(a.completedAt);});

        if(selectedHistory){
          var hj=pastJobs.find(function(j){return j.id===selectedHistory;});
          if(!hj)return null;
          var myPay=hj.twoCleaners?(hj.cleanerId===user.id?hj.pay1:hj.pay2):hj.pay;
          return(
            <div>
              <button onClick={function(){setSelectedHistory(null);}}
                style={{background:"none",border:"none",color:"#CC0000",fontSize:14,cursor:"pointer",padding:"0 0 14px",fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
                ← Back to History
              </button>
              <div className="card" style={{marginBottom:12,background:"linear-gradient(135deg,rgba(204,0,0,.08),transparent)"}}>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,marginBottom:4}}>{hj.propertyName}</div>
                <div style={{fontSize:11,color:C.muted,marginBottom:10}}>{hj.completedAt?new Date(hj.completedAt).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}):""}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:4}}>
                  <div style={{background:"rgba(34,197,94,.08)",borderRadius:8,padding:"10px",textAlign:"center"}}>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,color:"#22C55E"}}>${myPay||0}</div>
                    <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.3}}>Earned</div>
                  </div>
                  <div style={{background:"rgba(204,0,0,.08)",borderRadius:8,padding:"10px",textAlign:"center"}}>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,color:"#CC0000"}}>{hj.durationStr||"—"}</div>
                    <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.3}}>Duration</div>
                  </div>
                  <div style={{background:"rgba(245,158,11,.08)",borderRadius:8,padding:"10px",textAlign:"center"}}>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,color:hj.status==="approved"?"#22C55E":"#F59E0B"}}>{hj.status==="approved"?"✓ Paid":"⏳ Pending"}</div>
                    <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.3}}>Status</div>
                  </div>
                </div>
              </div>

              {/* Task snapshot */}
              {hj.tasks&&hj.tasks.length>0&&(
                <div className="card" style={{marginBottom:12}}>
                  <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:10}}>
                    ✅ TASKS — {(hj.tasks||[]).filter(function(t){return t.done;}).length}/{(hj.tasks||[]).length} completed
                  </div>
                  {[...new Set((hj.tasks||[]).map(function(t){return t.section;}))].map(function(sec){
                    var secTasks=(hj.tasks||[]).filter(function(t){return t.section===sec;});
                    return(
                      <div key={sec} style={{marginBottom:10}}>
                        <div style={{fontSize:10,color:C.red,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>{sec}</div>
                        {secTasks.map(function(t){return(
                          <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"5px 0",overflow:"hidden",borderBottom:"1px solid #1A1A1A"}}>
                            <span style={{fontSize:14,color:t.done?"#22C55E":"#444"}}>{t.done?"✓":"○"}</span>
                            <span style={{fontSize:12,color:t.done?C.offWhite:"#555",textDecoration:"none",flex:1,wordBreak:"break-word",overflowWrap:"break-word",minWidth:0}}>{t.label}</span>
                          </div>
                        );})}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inventory snapshot */}
              {hj.inventory&&hj.inventory.length>0&&(
                <div className="card" style={{marginBottom:12}}>
                  <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:10}}>📦 INVENTORY REPORTED</div>
                  {(hj.inventory||[]).filter(function(i){return i.cleanerStatus;}).map(function(inv){
                    var color=inv.cleanerStatus==="low"?"#EF4444":inv.cleanerStatus==="med"?"#F59E0B":"#22C55E";
                    return(
                      <div key={inv.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #1A1A1A"}}>
                        <span style={{fontSize:12,color:C.offWhite}}>{inv.item}</span>
                        <span style={{fontSize:11,fontWeight:700,color:color}}>{inv.cleanerStatus==="low"?"Low":inv.cleanerStatus==="med"?"Med":"Full"}</span>
                      </div>
                    );
                  })}
                  {(hj.inventory||[]).filter(function(i){return i.cleanerStatus;}).length===0&&(
                    <div style={{fontSize:12,color:C.muted}}>No inventory reported</div>
                  )}
                </div>
              )}

              {/* Notes */}
              {hj.cleanerNotes&&(
                <div className="card" style={{marginBottom:12}}>
                  <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:8}}>📝 YOUR NOTES</div>
                  <div style={{fontSize:12,color:C.offWhite,lineHeight:1.7}}>{hj.cleanerNotes}</div>
                </div>
              )}

              {/* Manager rating if available */}
              {(function(){
                var cl=(cleaners||[]).find(function(c){return c.id===user.id;})||{};
                var rev=(cl.reviews||[]).find(function(r){return r.property===hj.propertyName&&r.date&&Math.abs(new Date(r.date)-new Date(hj.completedAt))<7*24*3600000;});
                if(!rev)return null;
                return(
                  <div className="card" style={{marginBottom:12,border:"1px solid rgba(245,158,11,.3)"}}>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:8}}>⭐ MANAGER RATING</div>
                    <div style={{fontSize:18,marginBottom:6}}>{"⭐".repeat(rev.rating)}{"☆".repeat(5-rev.rating)}</div>
                    {rev.comment&&<div style={{fontSize:12,color:"#AAA",fontStyle:"italic",lineHeight:1.6}}>"{rev.comment}"<div style={{fontSize:10,color:"#555",marginTop:4,fontStyle:"normal"}}>— Harvey Johnson</div></div>}
                  </div>
                );
              })()}
            </div>
          );
        }

        return(
          <div>
            {pastJobs.length===0&&(
              <div className="card" style={{textAlign:"center",padding:32}}>
                <div style={{fontSize:36,marginBottom:10}}>📋</div>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,marginBottom:6}}>NO HISTORY YET</div>
                <div style={{fontSize:12,color:C.muted}}>Your completed jobs will appear here after approval.</div>
              </div>
            )}
            {pastJobs.map(function(j){
              var myPay=j.twoCleaners?(j.cleanerId===user.id?j.pay1:j.pay2):j.pay;
              return(
                <div key={j.id} onClick={function(){setSelectedHistory(j.id);}}
                  className="card" style={{marginBottom:10,cursor:"pointer",borderLeft:"3px solid "+(j.status==="approved"?"#22C55E":"#F59E0B")}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.propertyName}</div>
                      <div style={{fontSize:11,color:C.muted}}>{j.completedAt?new Date(j.completedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):""}{j.durationStr?" · ⏱ "+j.durationStr:""}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,color:"#22C55E"}}>${myPay||0}</div>
                      <div style={{fontSize:10,color:j.status==="approved"?"#22C55E":"#F59E0B",fontWeight:700}}>{j.status==="approved"?"✓ Paid":"⏳ Pending"}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:10,color:C.muted}}>{(j.tasks||[]).filter(function(t){return t.done;}).length} of {(j.tasks||[]).length} tasks completed</div>
                    <div style={{fontSize:10,color:C.red,fontWeight:700}}>View details →</div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Needs Resubmit banner for cleaner */}
      {jobsTab==="active"&&(function(){
        var resubmitJobs=(jobs||[]).filter(function(j){return j.cleanerId===user.id&&j.status==="needs_resubmit";});
        if(!resubmitJobs.length)return null;
        return(
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,letterSpacing:.5,color:"#EF4444",marginBottom:8}}>❌ NEEDS RESUBMIT ({resubmitJobs.length})</div>
            {resubmitJobs.map(function(job){return(
              <div key={job.id} className="card" style={{marginBottom:8,border:"1px solid rgba(239,68,68,.4)",background:"rgba(239,68,68,.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{job.propertyName}</div>
                    <div style={{fontSize:11,color:"#888"}}>Rejected {job.rejectedAt?new Date(job.rejectedAt).toLocaleDateString("en-US",{month:"short",day:"numeric"}):""}</div>
                  </div>
                  <div style={{fontSize:10,color:"#EF4444",fontWeight:700,background:"rgba(239,68,68,.1)",padding:"3px 8px",borderRadius:10,flexShrink:0}}>❌ REJECTED</div>
                </div>
                {job.rejectReason&&(
                  <div style={{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:6,padding:"8px 10px",marginBottom:10,fontSize:12,color:"#EF4444",lineHeight:1.6}}>
                    <strong>Harvey said:</strong> {job.rejectReason}
                  </div>
                )}
                <div style={{fontSize:11,color:"#888",lineHeight:1.6,marginBottom:10}}>
                  Fix the issues above and go back to the property to resubmit your clean.
                </div>
                <button onClick={function(){
                  // Restore the prop tasks/rooms/inventory from the rejected job so nothing is lost
                  setProps(function(ps){return ps.map(function(p){
                    if(p.id!==job.propertyId)return p;
                    return Object.assign({},p,{
                      // Restore tasks from the job snapshot
                      tasks:job.tasks&&job.tasks.length?job.tasks:p.tasks,
                      // Restore inventory from job snapshot
                      inventory:job.inventory&&job.inventory.length?job.inventory:p.inventory,
                      // Mark slot as accepted so prop shows in active list
                      schedule:(p.schedule||[]).map(function(s){
                        return (s.cleanerId===user.id||s.cleanerId2===user.id)?Object.assign({},s,{status:"accepted"}):s;
                      })
                    });
                  });});
                  // Mark job as in_progress (keeps rejection reason visible until resubmit)
                  setJobs(function(js){return js.map(function(j){
                    return j.id!==job.id?j:Object.assign({},j,{status:"in_progress",isBeingResubmitted:true,startedAt:j.startedAt||new Date().toISOString()});
                  });});
                  // Mark as started so START JOB button doesn't show
                  setJobStarted(function(prev){var u=Object.assign({},prev);u[job.propertyId]=true;return u;});
                  if(job.startedAt){
                    setJobStartTime(function(prev){var u=Object.assign({},prev);u[job.propertyId]=new Date(job.startedAt).getTime();return u;});
                  }
                  // Open the property immediately
                  setActiveId(job.propertyId);
                  setActiveTab("tasks");
                }}
                  style={{width:"100%",background:"#CC0000",border:"none",borderRadius:8,padding:"10px",color:"#FFF",fontSize:12,fontWeight:900,fontFamily:"Arial Black,sans-serif",cursor:"pointer",letterSpacing:.3}}>
                  🔄 OPEN JOB TO FIX & RESUBMIT
                </button>
              </div>
            );})}
          </div>
        );
      })()}

      {jobsTab==="active"&&myProps.length===0&&(
        <div className="card" style={{textAlign:"center",padding:36}}>
          <div style={{fontSize:44,marginBottom:12}}>🧹</div>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:15,fontWeight:900,letterSpacing:.5,marginBottom:8}}>NO JOBS ASSIGNED YET</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.7,marginBottom:16}}>Your manager hasn't assigned any cleaning jobs to you yet. Check back soon or reach out to them directly.</div>
          <div style={{background:"rgba(204,0,0,.06)",border:"1px solid rgba(204,0,0,.2)",borderRadius:10,padding:14,fontSize:12,color:"#888",lineHeight:1.6,textAlign:"left"}}>
            💡 Once assigned you'll see the property here with your full checklist, staging guides, inventory, and everything you need to complete the job and get paid.
          </div>
        </div>
      )}
      {jobsTab==="active"&&myProps.map(function(prop){
        var tasks=prop.tasks||[];
        var done=tasks.filter(function(t){return t.done;}).length;
        var pct=tasks.length>0?Math.round((done/tasks.length)*100):0;
        // Check if this prop has an active in_progress job (e.g. after resubmit)
    var activeJob=(jobs||[]).find(function(j){return j.propertyId===prop.id&&j.cleanerId===user.id&&(j.status==="in_progress"||j.status==="needs_resubmit");});
    var isResubmit=activeJob&&(activeJob.status==="needs_resubmit"||activeJob.isBeingResubmitted);
    var started=jobStarted[prop.id]||!!(activeJob);
        return(
          <div key={prop.id} onClick={function(){setActiveId(prop.id);setActiveTab("tasks");}}
            style={{background:C.card,borderRadius:12,overflow:"hidden",marginBottom:14,cursor:"pointer",border:"1px solid "+(C.border)}}>
            {prop.photo&&<img src={prop.photo} alt={prop.name} style={{width:"100%",height:120,objectFit:"cover",display:"block"}}/>}
            {!prop.photo&&<div style={{height:80,background:"linear-gradient(135deg,#1A1A1A,#2A0000)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,opacity:.4}}>🏠</div>}
            <div style={{padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontWeight:700,fontSize:14}}>{prop.name}</div>
                <span style={{background:"rgba(34,197,94,.15)",color:"#22C55E",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10}}>{fmt(prop.pay)}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div onClick={function(e){e.stopPropagation();if(prop.address){window.open("https://maps.google.com/?q="+encodeURIComponent(prop.address),"_blank");}}}
                  style={{fontSize:11,color:prop.address?"#CC0000":C.muted,cursor:prop.address?"pointer":"default",display:"flex",alignItems:"center",gap:4}}>
                  {prop.address||"No address set"}{prop.address&&<span>🗺️</span>}
                </div>
                {(prop.bedrooms||prop.totalBeds)&&(
                  <div style={{fontSize:10,color:C.muted,background:"#1A1A1A",borderRadius:4,padding:"2px 6px",flexShrink:0}}>
                    {prop.bedrooms?"🏠 "+prop.bedrooms+"bd":""}{prop.bathrooms?" · 🚿 "+(prop.bathrooms%1===0.5?Math.floor(prop.bathrooms)+"½":prop.bathrooms)+"ba":""}{prop.totalBeds?" · 🛏 "+prop.totalBeds+" beds":""}
                  </div>
                )}
              </div>
              <div style={{background:"#2A2A2A",borderRadius:4,height:6,marginBottom:6}}>
                <div style={{background:pct===100?"#22C55E":"#CC0000",height:6,borderRadius:4,width:(pct)+"%"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:6}}>
                <span style={{color:C.muted}}>{done}/{tasks.length} tasks</span>
                <span style={{color:pct===100?"#22C55E":started?"#F59E0B":C.muted,fontWeight:700}}>{pct===100?"✓ Done":started?"In Progress":"Not Started"}</span>
              </div>
              {/* Show pending acceptance slots */}
              {(function(){
                var pendingSlot=(prop.schedule||[]).find(function(s){return (s.cleanerId===user.id||s.cleanerId2===user.id)&&s.status==="pending_acceptance";});
                if(!pendingSlot)return null;
                var assignedAt=pendingSlot.assignedAt?new Date(pendingSlot.assignedAt):null;
                var hoursLeft=assignedAt?Math.max(0,8-((Date.now()-assignedAt.getTime())/3600000)):8;
                var urgent=hoursLeft<2;
                return(
                  <div style={{marginTop:8,background:urgent?"rgba(239,68,68,.08)":"rgba(245,158,11,.08)",border:"1px solid "+(urgent?"rgba(239,68,68,.3)":"rgba(245,158,11,.3)"),borderRadius:8,padding:"10px 12px"}}>
                    <div style={{fontSize:11,color:urgent?"#EF4444":"#F59E0B",fontWeight:700,marginBottom:8}}>
                      {urgent?"🚨":"⏳"} Job offer expires in {hoursLeft.toFixed(1)}h — respond now!
                    </div>
                    <div style={{fontSize:11,color:"#888",marginBottom:6}}>{pendingSlot.date} at {pendingSlot.time||"11:00"}</div>
                    {pendingSlot.twoCleaners&&(
                      <div style={{background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.2)",borderRadius:6,padding:"6px 10px",marginBottom:8,fontSize:11}}>
                        <span style={{color:"#3B82F6",fontWeight:700}}>👥 2-Cleaner Job · </span>
                        <span style={{color:"#888"}}>Your pay: </span>
                        <span style={{color:"#22C55E",fontWeight:700}}>${pendingSlot.cleanerId===user.id?(pendingSlot.pay1||0).toFixed(0):(pendingSlot.pay2||0).toFixed(0)}</span>
                        <span style={{color:"#555"}}> ({pendingSlot.cleanerId===user.id?pendingSlot.split1:pendingSlot.split2}%)</span>
                      </div>
                    )}
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={function(e){
                        e.stopPropagation();
                        setProps(function(ps){return ps.map(function(pp){
                          if(pp.id!==prop.id)return pp;
                          return Object.assign({},pp,{schedule:(pp.schedule||[]).map(function(s){
                            return s.id!==pendingSlot.id?s:Object.assign({},s,{status:"accepted"});
                          })});
                        });});
                        addNotification&&addNotification({type:"accepted",icon:"✅",title:"Job Accepted!",body:user.name+" accepted the job at "+prop.name+".",forRole:"manager",navTo:"Properties"});
                      }} style={{flex:1,background:"#22C55E",border:"none",borderRadius:6,padding:"8px",color:"#FFF",fontSize:11,fontWeight:900,fontFamily:"Arial Black,sans-serif",cursor:"pointer"}}>✓ ACCEPT</button>
                      <button onClick={function(e){
                        e.stopPropagation();
                        setProps(function(ps){return ps.map(function(pp){
                          if(pp.id!==prop.id)return pp;
                          return Object.assign({},pp,{schedule:(pp.schedule||[]).map(function(s){
                            return s.id!==pendingSlot.id?s:Object.assign({},s,{status:"declined"});
                          })});
                        });});
                        addNotification&&addNotification({type:"declined",icon:"❌",title:"Job Declined",body:user.name+" declined the job at "+prop.name+". Reassign or find backup.",forRole:"manager",navTo:"Properties"});
                      }} style={{flex:1,background:"transparent",border:"1px solid #EF4444",borderRadius:6,padding:"8px",color:"#EF4444",fontSize:11,fontWeight:900,fontFamily:"Arial Black,sans-serif",cursor:"pointer"}}>✗ DECLINE</button>
                    </div>
                  </div>
                );
              })()}
              <div style={{fontSize:10,color:C.red,fontWeight:700,textAlign:"center",letterSpacing:.5,marginTop:6}}>TAP TO OPEN →</div>
            </div>
          </div>
        );
      })}

      {/* Remove from Job Modal */}
      {removeRequest&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:400,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#141414",borderRadius:"16px 16px 0 0",width:"100%",padding:24,fontFamily:"Inter,sans-serif",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,letterSpacing:.5,color:"#EF4444",marginBottom:4}}>⚠️ REQUEST JOB REMOVAL</div>
            <div style={{fontSize:12,color:"#888",marginBottom:16}}>{removeRequest.prop.name} · {removeRequest.slot&&removeRequest.slot.date}</div>
            <div style={{fontSize:11,color:"#888",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"8px 12px",marginBottom:16,lineHeight:1.6}}>This request will be sent to Harvey for approval. You remain responsible for the job until he confirms your removal.</div>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,letterSpacing:.5,marginBottom:10}}>SELECT A REASON</div>
            {["Personal emergency","Family emergency","Medical / health issue","Transportation issue — no way to get there","Double booked by mistake","Property too far from my location","Other (explain below)"].map(function(reason){return(
              <div key={reason} onClick={function(){setRemoveReason(reason);}}
                style={{padding:"10px 14px",borderRadius:8,marginBottom:6,cursor:"pointer",
                  background:removeReason===reason?"rgba(239,68,68,.12)":"#1A1A1A",
                  border:"1px solid "+(removeReason===reason?"#EF4444":"#2A2A2A"),
                  color:removeReason===reason?"#FFF":"#888",fontSize:12,fontWeight:removeReason===reason?700:400,
                  display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:16,height:16,borderRadius:"50%",border:"2px solid "+(removeReason===reason?"#EF4444":"#444"),background:removeReason===reason?"#EF4444":"transparent",flexShrink:0}}/>
                {reason}
              </div>
            );})}
            <div style={{marginTop:10,marginBottom:16}}>
              <div style={{fontSize:11,color:"#888",marginBottom:6}}>Additional details (optional)</div>
              <textarea value={removeCustom} onChange={function(e){setRemoveCustom(e.target.value);}}
                placeholder="Explain your situation..." rows={3}
                style={{width:"100%",background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:8,color:"#FFF",fontSize:12,padding:"10px 12px",outline:"none",resize:"none",fontFamily:"Inter,sans-serif",lineHeight:1.6,boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){setRemoveRequest(null);setRemoveReason("");setRemoveCustom("");}}
                style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:8,padding:"11px",color:"#888",fontSize:12,cursor:"pointer"}}>Cancel</button>
              <button onClick={function(){
                if(!removeReason)return;
                var fullReason=removeCustom.trim()?removeReason+" — "+removeCustom.trim():removeReason;
                if(addNotification){addNotification({type:"removal_request",icon:"⚠️",title:"Removal Request — "+user.name,
                  body:user.name+" is requesting removal from "+removeRequest.prop.name+" on "+(removeRequest.slot&&removeRequest.slot.date)+". Reason: "+fullReason,
                  forRole:"manager",navTo:"Approvals",time:new Date().toISOString(),read:false});}
                // Add to pendingRemovals list directly - more reliable than slot flags
                if(setPendingRemovals){
                  setPendingRemovals(function(prev){
                    // avoid duplicates
                    var existing=prev.filter(function(r){return !(r.propId===removeRequest.prop.id&&r.slotId===(removeRequest.slot&&removeRequest.slot.id));});
                    return existing.concat([{
                      id:"rem"+Date.now(),
                      propId:removeRequest.prop.id,
                      propName:removeRequest.prop.name,
                      slotId:removeRequest.slot&&removeRequest.slot.id,
                      slotDate:removeRequest.slot&&removeRequest.slot.date,
                      slotTime:removeRequest.slot&&removeRequest.slot.time,
                      cleanerId:user.id,
                      cleanerName:user.name,
                      reason:fullReason,
                      time:new Date().toISOString()
                    }]);
                  });
                }
                setRemoveRequest(null);setRemoveReason("");setRemoveCustom("");
              }}
                style={{flex:2,background:removeReason?"#EF4444":"#2A2A2A",border:"none",borderRadius:8,padding:"11px",
                  color:removeReason?"#FFF":"#555",fontSize:12,fontWeight:900,fontFamily:"Arial Black,sans-serif",
                  cursor:removeReason?"pointer":"default",letterSpacing:.3}}>SEND REQUEST</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function Messages({user,cleaners,addNotification}){
  var isManager=user&&user.role==="manager";
  const [selCleaner,setSelCleaner]=useState(null);
  const [showBroadcast,setShowBroadcast]=useState(false);
  const [broadcastInput,setBroadcastInput]=useState("");
  const [msgs,setMsgs]=useState(function(){
    try{
      var flag=localStorage.getItem("turnready_is_real_user");
      if(flag==="true")return {};
      var s=localStorage.getItem("turnready_msgs");
      return s?JSON.parse(s):{};
    }catch(e){return {};}
  });
  // Load messages from Supabase when a real user selects a contact
  const [msgsLoaded,setMsgsLoaded]=useState({});
  const [input,setInput]=useState("");
  const [mediaPreview,setMediaPreview]=useState(null); // {url, type:'image'|'video', name}

  // Real managers: show only real cleaners (UUID ids) — filter out demo Maria/James/Priya (c1/c2/c3)
  var _rmgr=user&&user.id&&user.id.includes("-");
  var contactList=isManager
    ?(_rmgr?cleaners.filter(function(c){return c.id&&c.id.includes("-");}):cleaners)
    :[{id:"mgr1",name:"Harvey Johnson",avatar:"HJ",role:"manager",email:"manager@turnready.app"}];

  // Load messages from Supabase when contact is selected
  useEffect(function(){
    if(!selCleaner||!user||!user.id||!user.id.includes("-"))return;
    if(msgsLoaded[selCleaner.id]||!selCleaner.id||!selCleaner.id.includes("-"))return;
    getMessages(user.id,selCleaner.id).then(function(dbMsgs){
      if(dbMsgs&&dbMsgs.length>0){
        var mapped=dbMsgs.map(function(m){
          return {
            id:m.id,
            role:m.from_id===user.id?(isManager?"manager":"cleaner"):(isManager?"cleaner":"manager"),
            text:m.text||"",
            media:m.media_url?{url:m.media_url,type:m.media_type,name:m.media_name}:null,
            time:new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
          };
        });
        var key=isManager?selCleaner.id:user.id;
        setMsgs(function(prev){
          var updated=Object.assign({},prev);
          updated[key]=mapped;
          return updated;
        });
        setMsgsLoaded(function(prev){return Object.assign({},prev,{[selCleaner.id]:true});});
      }
    }).catch(function(e){console.error("Messages load failed:",e.message);});
  },[selCleaner]);

  function send(){
    if(!input.trim()&&!mediaPreview||!selCleaner)return;
    var key=isManager?selCleaner.id:user.id;
    var newMsg={id:Date.now(),role:isManager?"manager":"cleaner",
      text:input.trim(),
      media:mediaPreview?{url:mediaPreview.url,type:mediaPreview.type,name:mediaPreview.name}:null,
      time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};
    setInput(""); setMediaPreview(null);
    // Save to Supabase if real users
    if(user&&user.id&&user.id.includes("-")&&selCleaner&&selCleaner.id&&selCleaner.id.includes("-")){
      var toId=isManager?selCleaner.id:selCleaner.id; // manager sends to cleaner, cleaner sends to manager
      sendMessage({
        from_id:user.id,
        to_id:toId,
        text:newMsg.text||null,
        media_url:newMsg.media?newMsg.media.url:null,
        media_type:newMsg.media?newMsg.media.type:null,
        media_name:newMsg.media?newMsg.media.name:null,
      }).catch(function(e){console.error("Message save failed:",e.message);});
    }
    setMsgs(function(prev){
      var updated=Object.assign({},prev);
      updated[key]=(prev[key]||[]).concat([newMsg]);
      try{localStorage.setItem("turnready_msgs",JSON.stringify(updated));}catch(e){}
      return updated;
    });
    setInput("");
    // Notify the recipient
    if(addNotification){
      if(isManager){
        // Manager messaging cleaner - notify that cleaner (#35 reverse: manager->cleaner)
        addNotification({type:"message",icon:"💬",title:"Message from Harvey",body:input.trim().slice(0,60)+(input.trim().length>60?"...":""),forRole:"cleaner",forCleaner:selCleaner.id,navTo:"Messages",time:new Date().toISOString(),read:false});
      } else {
        // Cleaner messaging manager - notify manager (#33)
        addNotification({type:"message",icon:"💬",title:"New Message from "+user.name,body:input.trim().slice(0,60)+(input.trim().length>60?"...":""),forRole:"manager",navTo:"Messages",time:new Date().toISOString(),read:false});
      }
    }
  }

  function broadcast(){
    if(!broadcastInput.trim())return;
    var msg={id:Date.now(),role:"manager",text:"📢 "+broadcastInput.trim(),time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),isBroadcast:true};
    // Send to ALL cleaners
    setMsgs(function(prev){
      var updated=Object.assign({},prev);
      cleaners.forEach(function(c){
        updated[c.id]=(prev[c.id]||[]).concat([msg]);
        // Notify each cleaner of broadcast
        if(addNotification){
          addNotification({type:"message",icon:"📢",title:"Broadcast from Harvey",body:broadcastInput.trim().slice(0,60)+(broadcastInput.trim().length>60?"...":""),forRole:"cleaner",forCleaner:c.id,navTo:"Messages",time:new Date().toISOString(),read:false});
        }
      });
      try{localStorage.setItem("turnready_msgs",JSON.stringify(updated));}catch(e){}
      return updated;
    });
    setBroadcastInput("");
    setShowBroadcast(false);
  }

  // Chat thread view
  if(selCleaner){
    var key=isManager?selCleaner.id:user.id;
    var thread=msgs[key]||[];
    return(
      <div style={{fontFamily:"Inter,sans-serif",display:"flex",flexDirection:"column",height:"calc(100vh - 140px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexShrink:0}}>
          <button onClick={function(){setSelCleaner(null);}} style={{background:"none",border:"none",color:"#CC0000",fontSize:20,cursor:"pointer",padding:0}}>{"<"}</button>
          <div style={{width:36,height:36,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#FFF",flexShrink:0}}>{selCleaner.avatar||(selCleaner.name||"?")[0]}</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,letterSpacing:.3}}>{selCleaner.name}</div>
            <div style={{fontSize:10,color:"#888"}}>{selCleaner.email}</div>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,paddingBottom:12,WebkitOverflowScrolling:"touch"}}>
          {thread.length===0&&(
            <div style={{textAlign:"center",padding:40,color:"#555"}}>
              <div style={{fontSize:32,marginBottom:8}}>💬</div>
              <div style={{fontSize:12}}>No messages yet. Say hello!</div>
            </div>
          )}
          {thread.map(function(m){
            var isMe=isManager?m.role==="manager":m.role==="cleaner";
            return(
              <div key={m.id} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"78%"}}>
                  {m.isBroadcast&&!isMe&&(
                    <div style={{fontSize:9,color:"#F59E0B",fontWeight:700,marginBottom:3,paddingLeft:4}}>📢 BROADCAST</div>
                  )}
                  <div style={{background:isMe?"#CC0000":"#1A1A1A",borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",padding:"10px 14px"}}>
                    <div>
                      {m.media&&m.media.type==="image"&&(
                        <div style={{position:"relative",display:"inline-block",maxWidth:"100%"}}>
                          <img src={m.media.url} alt={m.media.name||"image"}
                            style={{maxWidth:"100%",maxHeight:220,borderRadius:8,marginBottom:m.text?6:0,display:"block"}}/>
                          <button onClick={function(){downloadMedia(m.media.url,m.media.name||"image.jpg");}}
                            style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.75)",border:"none",borderRadius:6,color:"#FFF",fontSize:10,padding:"3px 8px",cursor:"pointer",fontWeight:700}}>⬇️</button>
                        </div>
                      )}
                      {m.media&&m.media.type==="video"&&(
                        <div style={{position:"relative"}}>
                          <video src={m.media.url} controls
                            style={{maxWidth:"100%",maxHeight:200,borderRadius:8,marginBottom:m.text?6:0,display:"block"}}/>
                          <button onClick={function(){downloadMedia(m.media.url,m.media.name||"video.mp4");}}
                            style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.75)",border:"none",borderRadius:6,color:"#FFF",fontSize:10,padding:"3px 8px",cursor:"pointer",fontWeight:700}}>⬇️</button>
                        </div>
                      )}
                      {m.text&&<div style={{fontSize:13,color:"#FFF",lineHeight:1.5}}>{m.text}</div>}
                    </div>
                  </div>
                  <div style={{fontSize:10,color:"#555",marginTop:3,textAlign:isMe?"right":"left",paddingHorizontal:4}}>{m.time}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{flexShrink:0,paddingTop:8,borderTop:"1px solid #2A2A2A"}}>
          {/* Media preview above input */}
          {mediaPreview&&(
            <div style={{position:"relative",marginBottom:8,display:"inline-block"}}>
              {mediaPreview.type==="image"?(
                <img src={mediaPreview.url} style={{maxHeight:100,maxWidth:"100%",borderRadius:8,display:"block"}}/>
              ):(
                <video src={mediaPreview.url} style={{maxHeight:100,maxWidth:"100%",borderRadius:8,display:"block"}}/>
              )}
              <button onClick={function(){setMediaPreview(null);}}
                style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.75)",border:"none",
                  borderRadius:"50%",width:22,height:22,color:"#FFF",fontSize:12,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              <div style={{fontSize:10,color:"#888",marginTop:2}}>{mediaPreview.name}</div>
            </div>
          )}
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {/* 📷 Take Photo */}
            <label style={{width:38,height:38,borderRadius:"50%",background:"#1A1A1A",border:"1px solid #2A2A2A",
              display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:17}} title="Take Photo">
              📷
              <input type="file" accept="image/*" capture="environment"
                style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                onChange={function(e){
                  var file=e.target.files[0]; if(!file)return;
                  var reader=new FileReader();
                  reader.onload=function(ev){setMediaPreview({url:ev.target.result,type:"image",name:file.name});};
                  reader.readAsDataURL(file);
                  e.target.value="";
                }}/>
            </label>
            {/* 🎬 Record Video */}
            <label style={{width:38,height:38,borderRadius:"50%",background:"#1A1A1A",border:"1px solid #2A2A2A",
              display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:17}} title="Record Video">
              🎬
              <input type="file" accept="video/*" capture="environment"
                style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                onChange={function(e){
                  var file=e.target.files[0]; if(!file)return;
                  var reader=new FileReader();
                  reader.onload=function(ev){setMediaPreview({url:ev.target.result,type:"video",name:file.name});};
                  reader.readAsDataURL(file);
                  e.target.value="";
                }}/>
            </label>
            {/* 📁 Upload from Gallery */}
            <label style={{width:38,height:38,borderRadius:"50%",background:"#1A1A1A",border:"1px solid #2A2A2A",
              display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:17}} title="Upload from Gallery">
              📁
              <input type="file" accept="image/*,video/*"
                style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}}
                onChange={function(e){
                  var file=e.target.files[0]; if(!file)return;
                  var reader=new FileReader();
                  reader.onload=function(ev){setMediaPreview({url:ev.target.result,type:file.type.startsWith("video")?"video":"image",name:file.name});};
                  reader.readAsDataURL(file);
                  e.target.value="";
                }}/>
            </label>
            <input value={input} onChange={function(e){setInput(e.target.value);}}
              onKeyDown={function(e){if(e.key==="Enter")send();}}
              placeholder={"Message "+selCleaner.name+"..."}
              style={{flex:1,background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:22,padding:"11px 16px",color:"#FFF",fontSize:14,outline:"none",fontFamily:"Inter,sans-serif"}}/>
            {(function(){
              var canSend=input.trim()||mediaPreview;
              return(
                <button onClick={send} disabled={!canSend}
                  style={{width:44,height:44,borderRadius:"50%",background:canSend?"#CC0000":"#2A2A2A",border:"none",color:"#FFF",fontSize:18,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:canSend?"pointer":"default"}}>
                  {"→"}
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }
  // List view
  return(
    <div style={{fontFamily:"Inter,sans-serif"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1}}>MESSAGES</div>
        {isManager&&(
          <button onClick={function(){setShowBroadcast(!showBroadcast);}}
            style={{background:showBroadcast?"#CC0000":"transparent",border:"1px solid #CC0000",borderRadius:8,color:showBroadcast?"#FFF":"#CC0000",fontSize:10,fontWeight:900,padding:"6px 12px",cursor:"pointer",fontFamily:"Arial Black,sans-serif",letterSpacing:.5}}>
            📢 BROADCAST
          </button>
        )}
      </div>

      {/* Broadcast panel */}
      {showBroadcast&&isManager&&(
        <div className="card" style={{marginBottom:16,border:"1px solid rgba(245,158,11,.4)"}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,color:"#F59E0B",marginBottom:4,letterSpacing:.5}}>📢 BROADCAST TO ALL CLEANERS</div>
          <div style={{fontSize:11,color:"#888",marginBottom:12,lineHeight:1.6}}>
            This message will be sent to all {cleaners.length} cleaner{cleaners.length!==1?"s":""} at once — {cleaners.map(function(c){return c.name.split(" ")[0];}).join(", ")}.
          </div>
          <textarea value={broadcastInput} onChange={function(e){setBroadcastInput(e.target.value);}}
            placeholder="e.g. Reminder: all jobs this weekend require pre-clean video. Please confirm receipt..."
            rows={3}
            style={{width:"100%",background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:8,color:"#FFF",fontSize:13,padding:"10px 12px",outline:"none",resize:"none",fontFamily:"Inter,sans-serif",lineHeight:1.6,boxSizing:"border-box",marginBottom:10}}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={broadcast} disabled={!broadcastInput.trim()}
              style={{flex:2,background:broadcastInput.trim()?"#F59E0B":"#2A2A2A",border:"none",borderRadius:8,color:broadcastInput.trim()?"#000":"#555",fontSize:12,fontWeight:900,padding:"10px",cursor:broadcastInput.trim()?"pointer":"default",fontFamily:"Arial Black,sans-serif",letterSpacing:.5}}>
              SEND TO ALL
            </button>
            <button onClick={function(){setShowBroadcast(false);setBroadcastInput("");}}
              style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:8,color:"#888",fontSize:12,padding:"10px",cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Contact list */}
      <div style={{display:"flex",flexDirection:"column",gap:1}}>
        {contactList.map(function(c){
          var threadKey=isManager?c.id:user.id;
          var thread=msgs[threadKey]||[];
          var lastMsg=thread[thread.length-1];
          var unread=isManager
            ?thread.filter(function(m){return m.role!=="manager";}).length
            :thread.filter(function(m){return m.role==="manager";}).length;
          var hasBroadcast=thread.some(function(m){return m.isBroadcast;});
          return(
            <div key={c.id} onClick={function(){setSelCleaner(c);}}
              style={{display:"flex",alignItems:"center",gap:12,padding:"14px 12px",background:"#141414",borderRadius:10,cursor:"pointer",marginBottom:4,border:"1px solid "+(unread>0?"rgba(204,0,0,.2)":"#1A1A1A")}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#FFF",flexShrink:0,position:"relative"}}>
                {c.avatar||(c.name||"?")[0]}
                {unread>0&&<div style={{position:"absolute",top:-2,right:-2,width:16,height:16,borderRadius:"50%",background:"#CC0000",border:"2px solid #0D0D0D",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,color:"#FFF"}}>{unread}</div>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <div style={{fontWeight:700,fontSize:14}}>{c.name}</div>
                  {lastMsg&&<div style={{fontSize:10,color:"#555"}}>{lastMsg.time}</div>}
                </div>
                <div style={{fontSize:12,color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {lastMsg?(lastMsg.isBroadcast?"📢 "+lastMsg.text.replace("📢 ",""):lastMsg.text):"Tap to message"}
                </div>
              </div>
              <div style={{color:"#444",fontSize:16,flexShrink:0}}>›</div>
            </div>
          );
        })}
      </div>

    </div>
  );
}


// ─── THE HARVEY SYSTEM ──────────────────────────────────────────────────────
function HarveySystem({user}){
  const [openSection,setOpenSection]=useState(null);

  var sections=[
    {
      id:"understanding",
      icon:"🏠",
      title:"Understanding STR Cleaning",
      color:"#3B82F6",
      intro:"Short-term rental cleaning is not the same as regular house cleaning. This is hospitality work disguised as cleaning work. Every guest is a stranger paying premium money — zero tolerance for mistakes.",
      steps:[
        {num:"🎯",title:"What a Turnover Actually Is",content:"A turnover means preparing a home between guests — taking a space that was just occupied and resetting it to look completely untouched, welcoming, and ready for the next arrival. You are responsible for 5 distinct tasks: Cleaning, Sanitizing, Restocking, Staging, and Inspecting. Regular house cleaning is only about 60% of this job."},
        {num:"⚡",title:"How STR Differs from Regular Cleaning",content:"Regular cleaning: same family, flexible schedule, visible surfaces only, small imperfections forgiven. STR cleaning: strangers paying premium money, hard 4–5 hour deadline, every surface documented, mistakes mean 1-star reviews and lost contracts. The home must look exactly like the listing photos — completely untouched and staged."},
        {num:"👤",title:"The Four Roles You Play",content:"Role 1 — The Cleaner: Remove all visible dirt, dust, stains, hair, and grime. Role 2 — The Inspector: Walk through with a critical eye for broken items, damage, and missing supplies. Document before the next guest arrives or you may be blamed. Role 3 — The Stager: Prepare the property to look welcoming and exactly like the listing photos. Role 4 — The Reporter: Communicate clearly with Harvey about condition, issues, and completion. Good communication builds trust."},
        {num:"🔧",title:"Your Most Important Tool",content:"Before mops and vacuums — your body, mind, and focus. Rest 7–8 hours before a heavy cleaning day. Stay hydrated — keep a water bottle at every property. Exercise regularly — cleaning requires constant bending, lifting, and reaching. Eat protein and whole foods for sustained energy. Your body is your equipment. Treat it like one."},
        {num:"🛠️",title:"Required Tools — No Exceptions",content:"High-quality vacuum (weak suction forces you to cover the same area multiple times). Cell phone with excellent camera (damage documentation and video proof). 12–20 microfiber cloths in multiple colors — separate bathroom from kitchen. Disposable gloves always for toilets and trash. Extendable duster for ceiling fans and high corners. Streak-free glass cleaner, multi-surface cleaner, lint roller, and slip-resistant footwear — invest in quality shoes, you are on your feet 4–6 hours."},
      ]
    },
    {
      id:"corerule",
      icon:"⚡",
      title:"The Core Rule — One Category at a Time",
      color:"#CC0000",
      intro:"The #1 Rule: Work in categories, not rooms. Complete one type of task across the entire property before moving to the next. This is the foundation of The Harvey System. Everything else builds on this principle.",
      steps:[
        {num:"💧",title:"The Two Categories: Wet and Dry",content:"DRY tasks: dusting surfaces, making beds, straightening furniture, organizing items, fluffing pillows, removing trash. WET tasks: cleaning bathrooms (toilets, showers, sinks), wiping kitchens (counters, appliances), cleaning mirrors and glass, scrubbing tile and grout, mopping floors. Every task you perform falls into one of these two categories. Never mix them."},
        {num:"🔑",title:"The Golden Rule: Wet First, Then Dry",content:"Always do wet work first, then dry work. When you spray a surface, moisture attracts dust and creates streaks. When you scrub and wipe, debris falls onto surfaces you've already tidied. Wet work comes first so the messy, intensive cleaning is done before you organize, tidy, and perfect the details. Violating this rule forces you to re-clean areas."},
        {num:"🏠",title:"Floors Are Always Last — No Exceptions",content:"As you clean, everything falls down. Dust falls when you wipe surfaces. Crumbs get knocked off counters. Hair lands on the ground when you clean bathrooms. If you vacuum or mop first, you will do it again. Floors are the final step of every single clean — no exceptions, no matter how dirty they look when you arrive."},
        {num:"📋",title:"The Complete Workflow Order",content:"Phase 1 — Wet: Bathrooms. Spray and scrub toilets, showers, tubs, sinks, clean mirrors, wipe counters. Phase 2 — Wet: Kitchen. Wipe all counters and appliances, clean sink and faucet. Phase 3 — Dry: Bedrooms. Make beds with fresh linens, dust all surfaces, straighten furniture. Phase 4 — Dry: Living Areas. Dust, straighten furniture, arrange pillows and throws. Phase 5 — Floors. Vacuum carpet, sweep and mop hard floors, spot-clean marks."},
      ]
    },
    {
      id:"phases",
      icon:"🔄",
      title:"The 6 Turnover Phases",
      color:"#22C55E",
      intro:"Every professional STR turnover follows the same five phases in the same order. Skip a phase and you create problems. Follow the sequence exactly and the work flows smoothly from start to finish.",
      steps:[
        {num:"01",title:"Inspection Walkthrough",content:"Before you touch anything — walk through the entire property. Assess condition, document damage with timestamped photos, count beds and towel sets, identify maintenance issues. Use the Guest Cleanliness Score: 5=Excellent (standard clean), 4=Good (standard), 3=Moderate (add 20–30 min), 2=Heavy (add 45–60 min + fee), 1=Problem (photograph everything, contact Harvey before starting). This phase is information-gathering — never skip it."},
        {num:"02",title:"Laundry First",content:"The moment you start a load of laundry, that machine works while you clean. Strip all beds immediately upon arrival. Sort linens as you strip — sheets separate from towels. Start the first load within the first 5 minutes. Set a phone timer for each cycle — never forget to switch loads. Wet laundry left in the machine for more than 15 minutes develops a musty smell that contaminates clean linens. In a tight turnover window, this is the difference between finishing on time and running late."},
        {num:"03",title:"Global Trash Removal",content:"Before cleaning a single surface, walk through every room with a large trash bag and remove all guest trash. Check all trash cans and wastebaskets. Check under beds, behind furniture, and in closets. Check the refrigerator for left-behind food. Check outdoor areas — patio, grill, balcony. Replace all trash can liners after emptying. This creates a clean slate so you are not cleaning around clutter."},
        {num:"04",title:"Complete Cleaning",content:"Wet (Bathrooms first, then Kitchen) → Dry (Bedrooms first, then Living Areas) → Floors always last. This is the core of the system. Do not change the order. Wet before dry prevents re-cleaning. Bathrooms before kitchen keeps contamination contained. Bedrooms before living areas ensures linens are ready for staging. Floors last because everything you do above drops onto them."},
        {num:"05",title:"Final Inspection & Video Proof",content:"Walk through the entire property with fresh eyes after cleaning. Open the listing on your phone and verify every room matches the staging photos exactly. Only then begin your video walkthrough. Record slowly and narrate. Required areas: all bathrooms (toilet, shower, sink, towels, amenities), kitchen (all surfaces, coffee station set up), all bedrooms (bed fully made and staged). Video proof protects you from disputes and builds trust with Harvey."},
      ]
    },
    {
      id:"prestage",
      icon:"⭐",
      title:"Pre-Staging — The Secret Weapon",
      color:"#F59E0B",
      intro:"Pre-staging is gathering all your staging supplies and setting them in the room BEFORE you begin cleaning. This single technique saves 20–40 minutes per property and eliminates the constant back-and-forth that breaks your focus and flow.",
      steps:[
        {num:"💡",title:"What Pre-Staging Actually Means",content:"Before you start cleaning a room, walk in, gather everything you need for that room's staging, set it nearby, then clean. When you are done cleaning, all your staging supplies are already in place. No hunting for the fourth pillow. No walking to the linen closet three times. No interrupting your flow to find supplies. Without pre-staging: 15–25 minutes lost per property. With pre-staging: 20–40 minutes saved per property."},
        {num:"🚿",title:"Pre-Staging Bathrooms",content:"Gather all fresh towels — hand towels, bath towels, washcloths. Count and verify correct quantities before starting. Gather all guest amenities — shampoo, conditioner, body wash, soap, toilet paper. Place everything just outside the bathroom. Now clean with a completely clear workspace. When done cleaning, stage everything without hunting for a single item."},
        {num:"🛏️",title:"Pre-Staging Bedrooms",content:"Gather all fresh linens — fitted sheet, duvet or flat sheet, all pillowcases, decorative pillows. Count pillowcases and verify they match the pillow count before starting. Pull clean linens from the dryer if ready — bring everything at once. Place all staging items on an uncluttered surface. Clean the bedroom, make the bed, and stage — everything is already in the room."},
        {num:"☕",title:"Pre-Staging Kitchens",content:"Gather coffee station supplies — K-cups, filters, sugar, creamer, mugs. Gather fresh dish towels and any kitchen amenities. Check supply levels — paper towels, dish soap, sponges stocked? Place everything in the kitchen before you begin cleaning. Clean fully, then set up the coffee station and stage — everything already there. Never set up the kitchen before cleaning it."},
        {num:"✅",title:"The Pre-Staging Checklist",content:"Scan and gather all staging items BEFORE you start cleaning. Count everything — verify quantities match what is needed for this property. Clean with a completely clear workspace. Stage immediately when cleaning is done — everything is already there. This sequence eliminates double trips, maintains focus, and shaves significant time off every single job."},
      ]
    },
    {
      id:"habits",
      icon:"🏆",
      title:"Habits That Separate Average from Elite",
      color:"#8B5CF6",
      intro:"A system tells you what to do. A habit ensures you do it automatically — without thinking, without effort, without relying on motivation. The goal is to internalize the system so deeply that it becomes second nature.",
      steps:[
        {num:"01",title:"Listen for Laundry",content:"Train yourself to hear the washer and dryer as a background priority. The moment you hear a cycle complete — even mid-task — switch that load immediately. Wet laundry left more than 15 minutes develops a musty smell that ruins clean linens. This habit alone prevents one of the most common and embarrassing STR cleaner mistakes."},
        {num:"02",title:"Only Stop for Three Things",content:"Once you are in a clean, protect your focus fiercely. You stop for three things only: laundry that needs switching, water to stay hydrated, and food if you need fuel. No personal phone calls. No social media. No personal check-ins. Everything else waits until the job is done. Your focus is the most valuable resource you have inside that property."},
        {num:"03",title:"Finish What You Start",content:"Do not leave a room until it is fully complete. Do not leave a task half-done to check on something else. Complete each space, do a final scan, then move on. Never come back to a room you have already finished. The moment you start bouncing between rooms, you break the system and invite mistakes."},
        {num:"04",title:"The Elite Multipliers",content:"Clean as you go — never walk past a mess, address it immediately. Keep your tools organized — your kit ends every job in the same state it started. Check corners and edges — most missed details are under the rim of toilets, behind faucet handles, and along baseboards. Look from multiple angles — a mirror that looks clean head-on may have streaks visible at an angle. Learn from every mistake — when Harvey points something out, analyze why you missed it and adjust your system."},
        {num:"05",title:"The 30-Day Habit Sprint",content:"Week 1: Listen for laundry. Week 2: Only stop for laundry, water, or food. Week 3: Finish what you start. Week 4: Add one elite habit. By day 30, these habits begin to feel automatic — and that is when the system truly starts working for you. You do not rise to the level of your goals. You fall to the level of your systems. — James Clear, Atomic Habits"},
      ]
    },
    {
      id:"unexpected",
      icon:"⚠️",
      title:"Handling the Unexpected",
      color:"#EF4444",
      intro:"Even with a perfect system, the unexpected happens. What separates elite cleaners from amateurs is not that they never face problems — it is how they respond to them.",
      steps:[
        {num:"🗑️",title:"Excessive Mess",content:"Complete your inspection first. Photograph everything before touching anything. Score the property on the cleanliness scale. Contact Harvey with your assessment, photos, estimated additional time, and the excess mess situation — before proceeding. Never do significant additional work without communicating first. Moderate mess: add 20–30 min. Heavy mess: add 45–60 min. Problem level: contact Harvey before starting anything."},
        {num:"📸",title:"Damage or Maintenance Issues",content:"Document all damage with timestamped photos the moment you discover it. Report to Harvey immediately with a clear description and photos. Determine if you can safely proceed or if the property needs service before the next guest. Your documentation is your protection — it proves the damage was pre-existing and not caused by your work. Never skip this step."},
        {num:"🧴",title:"Missing or Insufficient Supplies",content:"Assess what is missing and whether it is critical or non-critical. Contact Harvey with specific information: what is missing, what you have checked, and your proposed solution. Keep an emergency kit — backup sheet sets, extra towels, basic toilet paper, cleaning supplies. Flag all inventory levels in the app during your check so Harvey can reorder before the next turnover."},
        {num:"🧠",title:"Managing Your Mental State",content:"Separate the problem from your performance — the property being trashed is not your fault. Take a mental reset: walk through, photograph, step outside, contact Harvey, then begin with a clear head. Focus on what you can control — your attitude, your communication, your execution. How you handle a difficult property builds your reputation more than how you handle an easy one. Hosts remember who stayed calm."},
      ]
    },
    {
      id:"mindset",
      icon:"💭",
      title:"The 5-Star Mindset",
      color:"#CC0000",
      intro:"Systems get things done. Mindset determines the quality. You can follow every step and still deliver a 3-star clean if you do not care. This section is about why we do what we do.",
      steps:[
        {num:"💡",title:"Think Like the Guest",content:"Every decision you make in that property — ask yourself: would a guest notice this? Would they be impressed or disappointed? You are not cleaning for Harvey. You are cleaning for the family flying in for their anniversary trip, the couple on their honeymoon, the family of four on their first vacation in years. Clean for them."},
        {num:"⭐",title:"What 5 Stars Actually Means",content:"A 5-star rating is not given for a clean property. It is earned by a property that felt cared for. Guests rate the feeling — the tightly made bed, the folded towel, the shining mirror, the perfectly placed remote. They may not know exactly why they gave 5 stars. They just know it felt right. Your job is to make it feel right every single time."},
        {num:"🔄",title:"Systems Over Feelings",content:"On days when you are tired, frustrated, or rushed — the system protects the guest experience. You do not have to feel motivated to deliver a great clean. You just have to follow the system. That is the entire point. A professional shows up and executes the system regardless of how they feel. That is what separates professionals from everyone else."},
        {num:"📈",title:"Your Rating Is Your Brand",content:"Every job you complete adds to your rating. A 4.9 rating opens doors — better properties, more hours, higher pay, and first preference on same-day turnovers which pay more. A 3.5 rating closes them. Protect your rating like it is your reputation — because it is."},
        {num:"🤝",title:"We Win Together",content:"When guests leave 5-star reviews, Harvey gets more bookings. More bookings means more jobs for you. Your great work directly creates your own job security. This is not a vendor relationship — it is a partnership. Harvey invests in your success because your success is the business's success."},
      ]
    },
  ];

  return(
    <div style={{fontFamily:"Inter,sans-serif"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,rgba(204,0,0,.15),rgba(0,0,0,0))",borderRadius:16,padding:20,marginBottom:20,border:"1px solid rgba(204,0,0,.2)"}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:24,fontWeight:900,letterSpacing:1,marginBottom:4}}>
          THE <span style={{color:"#CC0000"}}>HARVEY</span> SYSTEM
        </div>
        <div style={{fontSize:13,color:"#888",lineHeight:1.7,marginBottom:12}}>
          Professional cleaning is not about checklists — it is about systems. Follow this system on every job, every time, and you will consistently deliver 5-star results.
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#FFF",flexShrink:0}}>HJ</div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#FFF"}}>Harvey Johnson</div>
            <div style={{fontSize:10,color:"#888"}}>Harvey's Professional Cleaning LLC</div>
          </div>
        </div>
      </div>

      {/* Sections */}
      {sections.map(function(sec){
        var isOpen=openSection===sec.id;
        return(
          <div key={sec.id} style={{marginBottom:10,borderRadius:12,overflow:"hidden",border:"1px solid #2A2A2A"}}>
            <div onClick={function(){setOpenSection(isOpen?null:sec.id);}}
              style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"#141414",cursor:"pointer"}}>
              <div style={{width:40,height:40,borderRadius:10,background:sec.color+"22",border:"1px solid "+sec.color+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                {sec.icon}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.3,marginBottom:2}}>{sec.title}</div>
                <div style={{fontSize:11,color:"#666",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sec.intro.slice(0,65)}...</div>
              </div>
              <div style={{color:sec.color,fontSize:18,flexShrink:0,transition:"transform .2s",transform:isOpen?"rotate(90deg)":"rotate(0deg)"}}>›</div>
            </div>
            {isOpen&&(
              <div style={{background:"#0D0D0D",padding:"0 16px 16px"}}>
                <div style={{fontSize:12,color:"#888",lineHeight:1.7,padding:"14px 0 16px",borderBottom:"1px solid #1A1A1A",fontStyle:"italic"}}>
                  {sec.intro}
                </div>
                {sec.steps.map(function(step,si){
                  return(
                    <div key={si} style={{display:"flex",gap:14,paddingTop:16,paddingBottom:16,borderBottom:si<sec.steps.length-1?"1px solid #1A1A1A":"none"}}>
                      <div style={{width:40,height:40,borderRadius:10,background:"rgba(204,0,0,.1)",border:"1px solid rgba(204,0,0,.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,color:sec.color,letterSpacing:.5}}>
                        {step.num}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.3,marginBottom:6,color:"#FFF"}}>{step.title}</div>
                        <div style={{fontSize:12,color:"#AAA",lineHeight:1.8}}>{step.content}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div style={{textAlign:"center",padding:"20px 0",fontSize:11,color:"#444",lineHeight:1.7}}>
        © Harvey's Professional Cleaning LLC · The Harvey System — All Rights Reserved
      </div>
    </div>
  );
}


// ─── CLEANER AVAILABILITY ───────────────────────────────────────────────────
function CleanerAvailabilityEmbedded({user,availability,setAvailability}){
  // Embedded version used inside the Calendar tab - same content, no separate page needed
  return <CleanerAvailability user={user} availability={availability} setAvailability={setAvailability}/>;
}

function CleanerAvailability({user,availability,setAvailability}){
  var myAvail=availability[user.id]||{blockedDates:[],blockedDays:[]};
  var today=new Date();
  const [month,setMonth]=useState(today.getMonth());
  const [year,setYear]=useState(today.getFullYear());
  const [note,setNote]=useState(myAvail.note||"");
  const [saved,setSaved]=useState(false);

  var monthNames=["January","February","March","April","May","June","July","August","September","October","November","December"];
  var dayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var firstDay=new Date(year,month,1).getDay();
  var daysInMonth=new Date(year,month+1,0).getDate();

  function dateStr(d){
    return year+"-"+(String(month+1).padStart(2,"0"))+"-"+(String(d).padStart(2,"0"));
  }

  function toggleDate(ds){
    var blocked=myAvail.blockedDates||[];
    var newBlocked=blocked.includes(ds)?blocked.filter(function(d){return d!==ds;}):[...blocked,ds];
    var updated=Object.assign({},myAvail,{blockedDates:newBlocked});
    setAvailability(function(prev){var u=Object.assign({},prev);u[user.id]=updated;return u;});
  }

  function toggleDay(dayIdx){
    var blocked=myAvail.blockedDays||[];
    var newBlocked=blocked.includes(dayIdx)?blocked.filter(function(d){return d!==dayIdx;}):[...blocked,dayIdx];
    var updated=Object.assign({},myAvail,{blockedDays:newBlocked});
    setAvailability(function(prev){var u=Object.assign({},prev);u[user.id]=updated;return u;});
  }

  function saveNote(){
    var updated=Object.assign({},myAvail,{note:note});
    setAvailability(function(prev){var u=Object.assign({},prev);u[user.id]=updated;return u;});
    setSaved(true);
    setTimeout(function(){setSaved(false);},2000);
  }

  var blockedDates=myAvail.blockedDates||[];
  var blockedDays=myAvail.blockedDays||[];
  var todayStr=today.getFullYear()+"-"+(String(today.getMonth()+1).padStart(2,"0"))+"-"+(String(today.getDate()).padStart(2,"0"));

  return(
    <div style={{fontFamily:"Inter,sans-serif"}}>
      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1,marginBottom:6}}>MY AVAILABILITY</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:16,lineHeight:1.6}}>Tap dates you are NOT available. Your manager will see this when assigning jobs.</div>

      {/* Recurring days off */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:4}}>RECURRING DAYS OFF</div>
        <div style={{fontSize:11,color:C.muted,marginBottom:10}}>Days you are never available (every week)</div>
        <div style={{display:"flex",gap:6}}>
          {dayNames.map(function(d,i){
            var blocked=blockedDays.includes(i);
            return(
              <button key={i} onClick={function(){toggleDay(i);}}
                style={{flex:1,padding:"8px 2px",borderRadius:8,border:"1.5px solid "+(blocked?"#EF4444":"#2A2A2A"),background:blocked?"rgba(239,68,68,.12)":"transparent",color:blocked?"#EF4444":"#888",fontSize:10,fontWeight:700,cursor:"pointer",textAlign:"center"}}>
                {d.slice(0,1)}
              </button>
            );
          })}
        </div>
        {blockedDays.length>0&&(
          <div style={{fontSize:11,color:"#EF4444",marginTop:8,fontWeight:600}}>
            Off every: {blockedDays.map(function(d){return dayNames[d];}).join(", ")}
          </div>
        )}
      </div>

      {/* Month calendar */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <button onClick={function(){var m=month-1;if(m<0){setMonth(11);setYear(year-1);}else setMonth(m);}} style={{background:"none",border:"none",color:"#FFF",fontSize:20,cursor:"pointer",padding:"0 6px"}}>{"<"}</button>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900}}>{monthNames[month]} {year}</div>
          <button onClick={function(){var m=month+1;if(m>11){setMonth(0);setYear(year+1);}else setMonth(m);}} style={{background:"none",border:"none",color:"#FFF",fontSize:20,cursor:"pointer",padding:"0 6px"}}>{">"}</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:6}}>
          {["S","M","T","W","T","F","S"].map(function(d,i){return(
            <div key={i} style={{textAlign:"center",fontSize:10,color:C.muted,padding:"3px 0"}}>{d}</div>
          );})}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {Array(firstDay).fill(null).map(function(_,i){return <div key={"e"+i}/>;})}
          {Array(daysInMonth).fill(null).map(function(_,i){
            var d=i+1;
            var ds=dateStr(d);
            var isBlocked=blockedDates.includes(ds);
            var isDayBlocked=blockedDays.includes(new Date(year,month,d).getDay());
            var isPast=ds<todayStr;
            var isToday=ds===todayStr;
            return(
              <button key={d} onClick={function(){if(!isPast)toggleDate(ds);}} disabled={isPast}
                style={{minHeight:34,borderRadius:6,border:"1.5px solid "+(isBlocked?"#EF4444":isDayBlocked?"#333":isToday?"rgba(204,0,0,.4)":"#222"),
                  background:isBlocked?"rgba(239,68,68,.15)":isDayBlocked?"rgba(255,255,255,.02)":"transparent",
                  color:isPast?"#333":isBlocked?"#EF4444":isDayBlocked?"#555":isToday?"#CC0000":"#FFF",
                  fontSize:12,fontWeight:isToday?700:400,cursor:isPast?"default":"pointer",
                  textDecoration:isDayBlocked?"line-through":"none"}}>
                {d}
              </button>
            );
          })}
        </div>
        {blockedDates.filter(function(d){return d.startsWith(year+"-"+(String(month+1).padStart(2,"0")));}).length>0&&(
          <div style={{fontSize:11,color:"#EF4444",marginTop:10,fontWeight:600}}>
            {blockedDates.filter(function(d){return d.startsWith(year+"-"+(String(month+1).padStart(2,"0")));}).length} date{blockedDates.filter(function(d){return d.startsWith(year+"-"+(String(month+1).padStart(2,"0")));}).length!==1?"s":""} marked unavailable this month
          </div>
        )}
      </div>

      {/* Note to manager */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:4}}>NOTE TO MANAGER</div>
        <div style={{fontSize:11,color:C.muted,marginBottom:8}}>e.g. "Available after 10am only" or "No weekends in July"</div>
        <textarea value={note} onChange={function(e){setNote(e.target.value);}}
          placeholder="Any notes about your availability..."
          rows={3}
          style={{width:"100%",background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:8,color:"#FFF",fontSize:12,padding:"10px 12px",outline:"none",resize:"none",fontFamily:"Inter,sans-serif",lineHeight:1.6,boxSizing:"border-box",marginBottom:10}}/>
        <button onClick={saveNote}
          style={{width:"100%",background:saved?"#22C55E":"#CC0000",border:"none",borderRadius:8,color:"#FFF",fontSize:12,fontWeight:900,padding:"10px",cursor:"pointer",fontFamily:"Arial Black,sans-serif",letterSpacing:.5,transition:"background .3s"}}>
          {saved?"✓ SAVED!":"SAVE AVAILABILITY"}
        </button>
      </div>

      {/* Summary */}
      {(blockedDates.length>0||blockedDays.length>0)&&(
        <div className="card" style={{background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.2)"}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,color:"#EF4444",letterSpacing:.5,marginBottom:8}}>YOUR UNAVAILABILITY SUMMARY</div>
          {blockedDays.length>0&&<div style={{fontSize:12,color:"#AAA",marginBottom:4}}>Every <span style={{color:"#FFF",fontWeight:600}}>{blockedDays.map(function(d){return dayNames[d];}).join(", ")}</span></div>}
          {blockedDates.length>0&&<div style={{fontSize:12,color:"#AAA"}}>{blockedDates.length} specific date{blockedDates.length!==1?"s":""}  blocked</div>}
          <button onClick={function(){setAvailability(function(prev){var u=Object.assign({},prev);u[user.id]={blockedDates:[],blockedDays:[],note:""};return u;});setNote("");}}
            style={{marginTop:10,background:"transparent",border:"1px solid #444",borderRadius:6,color:"#666",fontSize:10,padding:"5px 12px",cursor:"pointer",width:"100%"}}>
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}


// ─── CLEANER RATINGS ────────────────────────────────────────────────────────
function CleanerRatings({user,cleaners,jobs,props,setView}){
  var cl=(cleaners||[]).find(function(c){return c.id===user.id;})||user;
  var reviews=cl.reviews||[];
  var myJobs=(jobs||[]).filter(function(j){return j.cleanerId===user.id&&j.status==="approved";});

  // Star breakdown
  function starCount(n){return reviews.filter(function(r){return r.rating===n;}).length;}

  return(
    <div style={{fontFamily:"Inter,sans-serif"}}>
      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1,marginBottom:16}}>MY RATINGS</div>

      {/* Overall score card */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:14}}>
          <div style={{textAlign:"center",flexShrink:0}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:44,fontWeight:900,color:"#F59E0B",lineHeight:1}}>{(cl.rating||5).toFixed(1)}</div>
            <div style={{fontSize:18,marginTop:4}}>{"⭐".repeat(Math.round(cl.rating||5))}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:4}}>{reviews.length} review{reviews.length!==1?"s":""}</div>
          </div>
          <div style={{flex:1}}>
            {[5,4,3,2,1].map(function(star){
              var count=starCount(star);
              var pct=reviews.length>0?Math.round((count/reviews.length)*100):0;
              return(
                <div key={star} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <span style={{fontSize:11,color:C.muted,width:8,textAlign:"right"}}>{star}</span>
                  <span style={{fontSize:10}}>⭐</span>
                  <div style={{flex:1,background:"#2A2A2A",borderRadius:4,height:6}}>
                    <div style={{background:"#F59E0B",height:6,borderRadius:4,width:pct+"%",transition:"width .4s"}}/>
                  </div>
                  <span style={{fontSize:10,color:C.muted,width:16,textAlign:"right"}}>{count||""}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,borderTop:"1px solid #2A2A2A",paddingTop:12}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,color:"#CC0000"}}>{myJobs.length}</div>
            <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.3}}>Jobs Done</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,color:"#22C55E"}}>${(cl.totalEarned||0).toFixed(0)}</div>
            <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.3}}>Earned</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,color:"#F59E0B"}}>★{(cl.rating||5).toFixed(1)}</div>
            <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.3}}>Avg Rating</div>
          </div>
        </div>
      </div>

      {/* Reviews list */}
      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,marginBottom:10,color:C.muted}}>FEEDBACK FROM MANAGER</div>

      {reviews.length===0&&(
        <div className="card" style={{textAlign:"center",padding:32}}>
          <div style={{fontSize:36,marginBottom:10}}>⭐</div>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,marginBottom:6}}>NO RATINGS YET</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Ratings appear here after your manager approves a job. Keep up the great work!</div>
        </div>
      )}

      {reviews.slice().reverse().map(function(review,i){
        var stars=review.rating||0;
        var starColor=stars>=4?"#22C55E":stars===3?"#F59E0B":"#EF4444";
        var label=stars===5?"Excellent":stars===4?"Good":stars===3?"Average":stars===2?"Below Standard":"Needs Improvement";
        // Try to find matching job
        var matchJob=myJobs.find(function(j){return j.propertyName===review.property;});
        return(
          <div key={i} onClick={function(){if(matchJob)setView("My Jobs");}}
            className="card" style={{marginBottom:10,cursor:matchJob?"pointer":"default",borderLeft:"3px solid "+starColor}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  {"⭐".repeat(stars).split("").map(function(_,si){return <span key={si} style={{fontSize:16}}>⭐</span>;})}
                  {"☆".repeat(5-stars).split("").map(function(_,si){return <span key={si} style={{fontSize:16,opacity:.3}}>☆</span>;})}
                </div>
                <div style={{fontWeight:700,fontSize:12,color:starColor}}>{label}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:11,color:C.muted}}>{review.date?new Date(review.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):""}</div>
                {matchJob&&<div style={{fontSize:9,color:C.red,fontWeight:700,marginTop:4}}>Tap to view job →</div>}
              </div>
            </div>
            <div style={{fontSize:12,fontWeight:600,color:C.offWhite,marginBottom:review.comment?8:0}}>{review.property||"Property"}</div>
            {review.comment?(
              <div style={{background:"#1A1A1A",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#AAA",lineHeight:1.6,fontStyle:"italic",borderLeft:"2px solid "+starColor}}>
                "{review.comment}"
                <div style={{fontSize:10,color:"#555",marginTop:6,fontStyle:"normal"}}>— Harvey Johnson</div>
              </div>
            ):(
              <div style={{fontSize:11,color:"#555",fontStyle:"italic"}}>No comment left</div>
            )}
          </div>
        );
      })}
    </div>
  );
}


function CleanerEarnings({user,cleaners,jobs}){
  var cl=(cleaners||[]).find(c=>c.id===user.id)||user;
  var fmt=n=>"$"+(n||0).toFixed(2);
  return(
    <div style={{fontFamily:"Inter,sans-serif"}}>
      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1,marginBottom:16}}>MY EARNINGS</div>
      {/* Stripe Status Card */}
      <div style={{background:"#141414",borderRadius:12,padding:14,marginBottom:16,border:"1px solid "+(cl.stripeStatus==="connected"?"rgba(34,197,94,.3)":cl.stripeStatus==="pending"?"rgba(245,158,11,.3)":"rgba(239,68,68,.3)")}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:8,background:"#635BFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💳</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.3,marginBottom:2}}>STRIPE PAYOUT</div>
            {cl.stripeStatus==="connected"&&(
              <div>
                <div style={{fontSize:11,color:"#22C55E",fontWeight:700}}>✓ Connected — Ready to receive payments</div>
                <div style={{fontSize:10,color:"#555",marginTop:2}}>Payments arrive within 1-2 business days after approval</div>
              </div>
            )}
            {cl.stripeStatus==="pending"&&(
              <div>
                <div style={{fontSize:11,color:"#F59E0B",fontWeight:700}}>⏳ Setup in progress</div>
                <div style={{fontSize:10,color:"#555",marginTop:2}}>Check your email to complete Stripe onboarding and unlock payouts</div>
              </div>
            )}
            {(!cl.stripeStatus||cl.stripeStatus==="not_connected")&&(
              <div>
                <div style={{fontSize:11,color:"#EF4444",fontWeight:700}}>✗ Not connected — payments on hold</div>
                <div style={{fontSize:10,color:"#555",marginTop:2}}>Contact your manager to send a Stripe setup invite</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[["Total Earned",fmt(cl.totalEarned||0),"#CC0000"],["Jobs Done",cl.jobsCompleted||0,"#FFF"],["Rating","★ "+(cl.rating||5).toFixed(1),"#F59E0B"],["Pending","$0.00","#888"]].map(([l,v,c])=>(
          <div key={l} className="stat-card">
            <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>{l}</div>
            <div style={{fontSize:20,fontWeight:700,color:c}}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PROFILE PAGE ───────────────────────────────────────────────────────────
function ProfilePage({user,setUser,cleaners,setCleaners,jobs,setShowMgrStripe}){
  var isManager=user.role==="manager";
  var myJobs=(jobs||[]).filter(function(j){return j.cleanerId===user.id&&j.status==="approved";});
  var cl=(cleaners||[]).find(function(c){return c.id===user.id;})||user;

  const [editing,setEditing]=useState(false);
  const [name,setName]=useState(user.name||"");
  const [phone,setPhone]=useState(user.phone||"");
  const [email,setEmail]=useState(user.email||"");
  const [emergency,setEmergency]=useState(user.emergency||"");
  const [businessName,setBusinessName]=useState(user.businessName||"");
  const [businessPhone,setBusinessPhone]=useState(user.businessPhone||"");
  const [businessAddress,setBusinessAddress]=useState(user.businessAddress||"");
  const [photo,setPhoto]=useState(user.photo||null);
  const [saved,setSaved]=useState(false);

  function saveProfile(){
    var updated=Object.assign({},user,{
      name:name.trim()||user.name,
      phone:phone.trim(),
      email:email.trim(),
      emergency:emergency.trim(),
      businessName:businessName.trim(),
      businessPhone:businessPhone.trim(),
      businessAddress:businessAddress.trim(),
      photo:photo,
      avatar:photo?null:(name.trim().split(" ").map(function(w){return w[0]||"";}).join("").slice(0,2).toUpperCase()),
    });
    setUser(updated);
    // Also update in cleaners array if cleaner
    if(!isManager){
      setCleaners(function(cs){return cs.map(function(c){return c.id!==user.id?c:Object.assign({},c,updated);});});
      // Persist to localStorage
      try{
        var stored=localStorage.getItem("turnready_cleaners");
        var existing=stored?JSON.parse(stored):[];
        var idx=existing.findIndex(function(c){return c.id===user.id;});
        if(idx>=0)existing[idx]=Object.assign({},existing[idx],updated);
        else existing.push(updated);
        localStorage.setItem("turnready_cleaners",JSON.stringify(existing));
      }catch(e){}
    }
    // Save to Supabase if real user
    if(user&&user.id&&user.id.includes("-")){
      var dbUpdates={
        name:updated.name,
        phone:updated.phone||null,
        avatar:updated.avatar||null,
        emergency:updated.emergency||null,
        business_name:updated.businessName||null,
        business_phone:updated.businessPhone||null,
        business_address:updated.businessAddress||null,
      };
      // Upload profile photo to Supabase Storage (not base64 in DB)
      if(updated.photo&&updated.photo.startsWith("data:image")){
        compressImage(updated.photo,400,400,0.85,function(compressed){
          // Upload to Storage
          uploadImageToStorage("profile-photos","users/"+user.id+"/profile.jpg",compressed).then(function(publicUrl){
            setUser(function(u){return Object.assign({},u,{photo:publicUrl});});
            updateUserProfile(user.id,Object.assign({},dbUpdates,{photo:publicUrl})).then(function(){
              setSaved(true);setEditing(false);setTimeout(function(){setSaved(false);},2500);
            }).catch(function(e){console.error("Profile save failed:",e.message);setSaved(true);setEditing(false);setTimeout(function(){setSaved(false);},2500);});
          }).catch(function(e){
            console.error("Profile photo upload failed:",e.message);
            // Fall back to saving base64
            updateUserProfile(user.id,Object.assign({},dbUpdates,{photo:compressed})).catch(function(e2){console.error("Profile save failed:",e2.message);});
            setSaved(true);setEditing(false);setTimeout(function(){setSaved(false);},2500);
          });
        });
      } else {
        updateUserProfile(user.id,dbUpdates).then(function(){
          setSaved(true);setEditing(false);setTimeout(function(){setSaved(false);},2500);
        }).catch(function(e){
          console.error("Profile save failed:",e.message);
          setSaved(true);setEditing(false);setTimeout(function(){setSaved(false);},2500);
        });
      }
    } else {
      setSaved(true);
      setEditing(false);
      setTimeout(function(){setSaved(false);},2500);
    }
  }

  function handlePhoto(e){
    var file=e.target.files[0];
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      compressImage(ev.target.result,400,400,0.85,function(compressed){
        setPhoto(compressed);
      });
    };
    reader.readAsDataURL(file);
  }

  var initials=(user.name||"?").split(" ").map(function(w){return w[0]||"";}).join("").slice(0,2).toUpperCase();

  return(
    <div style={{fontFamily:"Inter,sans-serif"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1}}>MY PROFILE</div>
        {saved&&<div style={{fontSize:12,color:"#22C55E",fontWeight:700}}>✓ Saved!</div>}
      </div>

      {/* Avatar + photo upload */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:24}}>
        <div style={{position:"relative",marginBottom:12}}>
          {photo?(
            <img src={photo} style={{width:96,height:96,borderRadius:"50%",objectFit:"cover",border:"3px solid #CC0000"}}/>
          ):(
            <div style={{width:96,height:96,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:900,color:"#FFF",border:"3px solid rgba(204,0,0,.4)"}}>
              {initials}
            </div>
          )}
          <label style={{position:"absolute",bottom:0,right:0,width:28,height:28,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"2px solid #0D0D0D"}}>
            <span style={{fontSize:14}}>📷</span>
            <input type="file" accept="image/*" style={{position:"fixed",top:-9999,left:-9999,opacity:0,width:1,height:1}} onChange={handlePhoto}/>
          </label>
        </div>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,letterSpacing:.5,marginBottom:4}}>{user.name}</div>
        <div style={{fontSize:12,color:C.muted}}>{isManager?"Manager · "+((user.businessName||"Harvey's Professional Cleaning")):"Cleaning Professional"}</div>
        {!isManager&&(
          <div style={{display:"flex",gap:16,marginTop:8}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,color:"#CC0000"}}>{myJobs.length}</div>
              <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.3}}>Jobs</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,color:"#22C55E"}}>${cl.totalEarned||0}</div>
              <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.3}}>Earned</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,color:"#F59E0B"}}>★{(cl.rating||5).toFixed(1)}</div>
              <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.3}}>Rating</div>
            </div>
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5}}>PERSONAL INFO</div>
          <button onClick={function(){setEditing(!editing);}}
            style={{background:editing?"transparent":"#CC0000",border:editing?"1px solid #444":"none",borderRadius:6,color:editing?C.muted:"#FFF",fontSize:11,fontWeight:700,padding:"5px 12px",cursor:"pointer",fontFamily:"Arial Black,sans-serif"}}>
            {editing?"CANCEL":"EDIT"}
          </button>
        </div>
        {[
          {label:"Full Name",val:name,set:setName,edit:editing},
          {label:"Phone",val:phone,set:setPhone,edit:editing},
          {label:"Email",val:email,set:setEmail,edit:editing,type:"email"},
          {label:"Emergency Contact",val:emergency,set:setEmergency,edit:editing,placeholder:"Name & phone number"},
        ].map(function(field){return(
          <div key={field.label} style={{marginBottom:12}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{field.label}</div>
            {field.edit?(
              <input value={field.val} onChange={function(e){field.set(e.target.value);}} type={field.type||"text"} placeholder={field.placeholder||""} style={{width:"100%",boxSizing:"border-box"}}/>
            ):(
              <div style={{fontSize:13,color:field.val?C.offWhite:C.muted,fontStyle:field.val?"normal":"italic"}}>{field.val||"Not set"}</div>
            )}
          </div>
        );})}
      </div>

      {/* Business info (manager only) */}
      {isManager&&(
        <div className="card" style={{marginBottom:14}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:14}}>BUSINESS INFO</div>
          {[
            {label:"Business Name",val:businessName,set:setBusinessName},
            {label:"Business Phone",val:businessPhone,set:setBusinessPhone},
            {label:"Business Address",val:businessAddress,set:setBusinessAddress},
          ].map(function(field){return(
            <div key={field.label} style={{marginBottom:12}}>
              <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{field.label}</div>
              {editing?(
                <input value={field.val} onChange={function(e){field.set(e.target.value);}} style={{width:"100%",boxSizing:"border-box"}}/>
              ):(
                <div style={{fontSize:13,color:field.val?C.offWhite:C.muted,fontStyle:field.val?"normal":"italic"}}>{field.val||"Not set"}</div>
              )}
            </div>
          );})}
        </div>
      )}

      {/* Cleaner extras */}
      {!isManager&&(
        <div className="card" style={{marginBottom:14}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:12}}>ACCOUNT INFO</div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Member Since</div>
            <div style={{fontSize:13,color:C.offWhite}}>{user.joinedAt?new Date(user.joinedAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}):"—"}</div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Role</div>
            <div style={{fontSize:13,color:cl.role==="primary"?"#F59E0B":C.offWhite}}>{cl.role==="primary"?"⭐ Primary Cleaner":"Backup Cleaner"}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Stripe Payout</div>
            <div style={{fontSize:13,color:cl.stripeStatus==="connected"?"#22C55E":cl.stripeStatus==="pending"?"#F59E0B":"#EF4444"}}>
              {cl.stripeStatus==="connected"?"💳 Connected ✓":cl.stripeStatus==="pending"?"⏳ Setup Pending":"❌ Not Connected"}
            </div>
          </div>
        </div>
      )}

      {/* Stripe Business Status for manager */}
      {isManager&&(
        <div className="card" style={{marginBottom:14,border:"1px solid "+(user.stripeBusinessStatus==="connected"?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)")}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:user.stripeBusinessStatus==="connected"?0:12}}>
            <div style={{width:36,height:36,borderRadius:8,background:"#635BFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💳</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.3}}>STRIPE BUSINESS</div>
              <div style={{fontSize:11,color:user.stripeBusinessStatus==="connected"?"#22C55E":"#EF4444",fontWeight:700,marginTop:2}}>
                {user.stripeBusinessStatus==="connected"?"✓ Connected — Ready to pay cleaners":"✗ Not connected — payouts blocked"}
              </div>
            </div>
          </div>
          {user.stripeBusinessStatus!=="connected"&&(
            <button onClick={function(){setShowMgrStripe&&setShowMgrStripe(true);}}
              style={{width:"100%",background:"#635BFF",border:"none",borderRadius:8,color:"#FFF",fontSize:12,fontWeight:900,padding:"10px",cursor:"pointer",fontFamily:"Arial Black,sans-serif",letterSpacing:.3}}>
              💳 SET UP STRIPE NOW
            </button>
          )}
          {user.stripeBusinessStatus==="connected"&&user.stripeBusinessAccount&&(
            <div style={{fontSize:10,color:"#555",marginTop:6}}>Account: {user.stripeBusinessAccount}</div>
          )}
        </div>
      )}

      {editing&&(
        <button onClick={saveProfile}
          style={{width:"100%",background:"#CC0000",border:"none",borderRadius:10,padding:"14px",color:"#FFF",fontSize:14,fontWeight:900,fontFamily:"Arial Black,sans-serif",letterSpacing:.5,cursor:"pointer",marginBottom:16}}>
          SAVE PROFILE
        </button>
      )}
    </div>
  );
}


// ─── LEADERBOARD ────────────────────────────────────────────────────────────
function Leaderboard({cleaners,jobs,props}){
  const [period,setPeriod]=useState("alltime");
  const [metric,setMetric]=useState("earned");
  const [selected,setSelected]=useState(null);

  var now=new Date();

  function getJobs(cleanerId){
    var base=jobs.filter(function(j){return j.status==="approved"&&j.cleanerId===cleanerId;});
    if(period==="month"){
      return base.filter(function(j){
        var d=new Date(j.completedAt);
        return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
      });
    }
    if(period==="week"){
      var weekAgo=new Date(now-7*24*3600000);
      return base.filter(function(j){return new Date(j.completedAt)>weekAgo;});
    }
    return base;
  }

  var ranked=cleaners.map(function(c){
    var cJobs=getJobs(c.id);
    var earned=cJobs.reduce(function(s,j){return s+j.pay;},0);
    var avgDuration=cJobs.filter(function(j){return j.duration;}).length>0
      ?Math.round(cJobs.filter(function(j){return j.duration;}).reduce(function(s,j){return s+j.duration;},0)/cJobs.filter(function(j){return j.duration;}).length/60)
      :0;
    return {cleaner:c,jobs:cJobs.length,earned:earned,rating:c.rating||5,avgMins:avgDuration};
  }).sort(function(a,b){
    if(metric==="earned")return b.earned-a.earned;
    if(metric==="jobs")return b.jobs-a.jobs;
    if(metric==="rating")return b.rating-a.rating;
    if(metric==="speed")return (a.avgMins||999)-(b.avgMins||999);
    return 0;
  });

  var medals=["🥇","🥈","🥉"];
  var maxVal=ranked.length>0?(metric==="earned"?ranked[0].earned:metric==="jobs"?ranked[0].jobs:metric==="rating"?ranked[0].rating:ranked[0].avgMins)||1:1;

  function metricVal(item){
    if(metric==="earned")return "$"+item.earned;
    if(metric==="jobs")return item.jobs+" jobs";
    if(metric==="rating")return "★"+item.rating.toFixed(1);
    if(metric==="speed")return item.avgMins?item.avgMins+"m avg":"—";
    return "";
  }
  function barVal(item){
    if(metric==="earned")return item.earned;
    if(metric==="jobs")return item.jobs;
    if(metric==="rating")return item.rating;
    if(metric==="speed")return item.avgMins?Math.max(0,maxVal-(item.avgMins-Math.min(...ranked.filter(function(r){return r.avgMins>0;}).map(function(r){return r.avgMins;}))||0)):0;
    return 0;
  }

  return(
    <div style={{fontFamily:"Inter,sans-serif"}}>
      {/* Detail view */}
      {selected&&(function(){
        var cl=cleaners.find(function(c){return c.id===selected;});
        if(!cl)return null;
        var allJobs=jobs.filter(function(j){return j.status==="approved"&&j.cleanerId===cl.id;});
        var periodJobs=getJobs(cl.id);
        var totalEarned=periodJobs.reduce(function(s,j){return s+j.pay;},0);
        var avgDuration=periodJobs.filter(function(j){return j.duration;}).length>0
          ?Math.round(periodJobs.filter(function(j){return j.duration;}).reduce(function(s,j){return s+j.duration;},0)/periodJobs.filter(function(j){return j.duration;}).length/60)
          :null;
        var rank=ranked.findIndex(function(r){return r.cleaner.id===cl.id;})+1;
        var reviews=cl.reviews||[];
        return(
          <div>
            {/* Back button */}
            <button onClick={function(){setSelected(null);}}
              style={{background:"none",border:"none",color:"#CC0000",fontSize:14,cursor:"pointer",padding:"0 0 12px",display:"flex",alignItems:"center",gap:6,fontWeight:700}}>
              ← Back to Leaderboard
            </button>

            {/* Header card */}
            <div className="card" style={{marginBottom:14,background:"linear-gradient(135deg,rgba(204,0,0,.1),transparent)"}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                <div style={{width:56,height:56,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#FFF",flexShrink:0,border:"3px solid rgba(204,0,0,.4)"}}>
                  {cl.avatar}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"Arial Black,sans-serif",fontSize:18,fontWeight:900,letterSpacing:.5,marginBottom:2}}>{cl.name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{cl.role==="primary"?"⭐ Primary Cleaner":"Backup Cleaner"} · Joined {cl.joinedAt?new Date(cl.joinedAt).toLocaleDateString("en-US",{month:"long",year:"numeric"}):""}</div>
                </div>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:22,fontWeight:900,color:"#FFD700"}}>#{rank}</div>
              </div>
              {/* Key stats */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[
                  ["💰","$"+totalEarned,period==="alltime"?"all time":period==="month"?"this month":"this week"],
                  ["🧹",periodJobs.length+" jobs",period==="alltime"?"completed":"this period"],
                  ["⭐",(cl.rating||5).toFixed(1)+" avg",reviews.length+" reviews"],
                  avgDuration?["⚡",avgDuration+"m","avg per job"]:["🏆","#"+rank,"ranking"],
                  ["💵","$"+cl.totalEarned,"all time total"],
                  ["📋",allJobs.length,"total jobs done"],
                ].map(function(stat,si){return(
                  <div key={si} style={{background:"rgba(0,0,0,.3)",borderRadius:8,padding:"10px 8px",textAlign:"center"}}>
                    <div style={{fontSize:16,marginBottom:4}}>{stat[0]}</div>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,color:"#FFF",marginBottom:2}}>{stat[1]}</div>
                    <div style={{fontSize:9,color:C.muted}}>{stat[2]}</div>
                  </div>
                );})}
              </div>
            </div>

            {/* Star rating breakdown */}
            {reviews.length>0&&(
              <div className="card" style={{marginBottom:14}}>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,marginBottom:12}}>⭐ RATINGS BREAKDOWN</div>
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:12}}>
                  <div style={{textAlign:"center",flexShrink:0}}>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:36,fontWeight:900,color:"#F59E0B",lineHeight:1}}>{(cl.rating||5).toFixed(1)}</div>
                    <div style={{fontSize:12,marginTop:4}}>{"⭐".repeat(Math.round(cl.rating||5))}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>{reviews.length} review{reviews.length!==1?"s":""}</div>
                  </div>
                  <div style={{flex:1}}>
                    {[5,4,3,2,1].map(function(star){
                      var count=reviews.filter(function(r){return r.rating===star;}).length;
                      var pct=reviews.length>0?Math.round((count/reviews.length)*100):0;
                      return(
                        <div key={star} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                          <span style={{fontSize:10,color:C.muted,width:8}}>{star}</span>
                          <span style={{fontSize:9}}>⭐</span>
                          <div style={{flex:1,background:"#2A2A2A",borderRadius:3,height:5}}>
                            <div style={{background:"#F59E0B",height:5,borderRadius:3,width:pct+"%"}}/>
                          </div>
                          <span style={{fontSize:9,color:C.muted,width:16,textAlign:"right"}}>{count||""}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {reviews.slice().reverse().slice(0,3).map(function(rev,i){
                  return(
                    <div key={i} style={{padding:"10px 0",borderTop:"1px solid #2A2A2A"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <div style={{fontSize:13}}>{"⭐".repeat(rev.rating)}{"☆".repeat(5-rev.rating)}</div>
                        <div style={{fontSize:10,color:C.muted}}>{rev.property}</div>
                        <div style={{fontSize:10,color:C.muted}}>{rev.date?new Date(rev.date).toLocaleDateString("en-US",{month:"short",day:"numeric"}):""}</div>
                      </div>
                      {rev.comment&&<div style={{fontSize:11,color:"#AAA",fontStyle:"italic",lineHeight:1.5}}>"{rev.comment}"</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Job history for this period */}
            <div className="card" style={{marginBottom:14}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.5,marginBottom:12}}>
                📋 JOB HISTORY {period==="alltime"?"":period==="month"?"— THIS MONTH":"— THIS WEEK"}
              </div>
              {periodJobs.length===0&&(
                <div style={{textAlign:"center",padding:20,color:C.muted,fontSize:12}}>No jobs in this period</div>
              )}
              {periodJobs.slice().reverse().slice(0,10).map(function(j,i){
                return(
                  <div key={j.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #2A2A2A"}}>
                    <div style={{fontSize:16,flexShrink:0}}>🏠</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.propertyName}</div>
                      <div style={{fontSize:10,color:C.muted}}>{j.completedAt?new Date(j.completedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):""}{j.durationStr?" · ⏱ "+j.durationStr:""}</div>
                    </div>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,color:"#22C55E",flexShrink:0}}>${j.pay}</div>
                  </div>
                );
              })}
              {periodJobs.length>10&&<div style={{fontSize:10,color:C.muted,textAlign:"center",marginTop:8}}>Showing 10 of {periodJobs.length} jobs</div>}
            </div>

            {/* Stripe status */}
            <div className="card" style={{border:"1px solid "+(cl.stripeStatus==="connected"?"rgba(34,197,94,.3)":"rgba(245,158,11,.3)")}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:8,background:"#635BFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>💳</div>
                <div>
                  <div style={{fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,letterSpacing:.3}}>STRIPE PAYOUT</div>
                  <div style={{fontSize:11,color:cl.stripeStatus==="connected"?"#22C55E":"#F59E0B",fontWeight:700,marginTop:2}}>
                    {cl.stripeStatus==="connected"?"✓ Connected — Ready for payouts":"⏳ Setup Pending"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {!selected&&(
      <div>
      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1,marginBottom:4}}>🏆 LEADERBOARD</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Cleaner performance rankings</div>

      {/* Period selector */}
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {[["alltime","All Time"],["month","This Month"],["week","This Week"]].map(function(p){return(
          <button key={p[0]} onClick={function(){setPeriod(p[0]);}}
            style={{flex:1,padding:"7px 4px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"Arial Black,sans-serif",
              background:period===p[0]?"#CC0000":"transparent",
              borderColor:period===p[0]?"#CC0000":"#333",
              color:period===p[0]?"#FFF":C.muted}}>
            {p[1]}
          </button>
        );})}
      </div>

      {/* Metric selector */}
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {[["earned","💰 Earned"],["jobs","🧹 Jobs"],["rating","⭐ Rating"],["speed","⚡ Speed"]].map(function(m){return(
          <button key={m[0]} onClick={function(){setMetric(m[0]);}}
            style={{flex:1,padding:"6px 2px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:9,fontWeight:700,fontFamily:"Arial Black,sans-serif",
              background:metric===m[0]?"rgba(204,0,0,.15)":"transparent",
              borderColor:metric===m[0]?"#CC0000":"#333",
              color:metric===m[0]?"#CC0000":C.muted}}>
            {m[1]}
          </button>
        );})}
      </div>

      {/* Top 3 podium */}
      {ranked.length>=3&&(
        <div className="card" style={{marginBottom:16,background:"linear-gradient(135deg,rgba(204,0,0,.08),rgba(0,0,0,0))"}}>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:12,paddingTop:8}}>
            {[1,0,2].map(function(idx){
              var item=ranked[idx];
              if(!item)return null;
              var isFirst=idx===0;
              return(
                <div key={item.cleaner.id} style={{textAlign:"center",flex:1}}>
                  <div style={{fontSize:isFirst?28:22,marginBottom:4}}>{medals[idx]}</div>
                  <div style={{width:isFirst?56:44,height:isFirst?56:44,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isFirst?18:14,fontWeight:900,color:"#FFF",margin:"0 auto 6px",border:isFirst?"3px solid #FFD700":"2px solid #CC0000"}}>
                    {item.cleaner.avatar}
                  </div>
                  <div onClick={function(){setSelected(item.cleaner.id);}} style={{fontSize:11,fontWeight:700,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"pointer",color:"#CC0000"}}>{item.cleaner.name.split(" ")[0]} ›</div>
                  <div style={{fontFamily:"Arial Black,sans-serif",fontSize:isFirst?16:13,fontWeight:900,color:"#CC0000"}}>{metricVal(item)}</div>
                  <div style={{height:isFirst?60:40,background:"rgba(204,0,0,.2)",borderRadius:"6px 6px 0 0",marginTop:8,border:"1px solid rgba(204,0,0,.3)"}}/>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full rankings */}
      <div>
        {ranked.map(function(item,i){
          var pct=maxVal>0?Math.round((barVal(item)/maxVal)*100):0;
          var isTop=i===0;
          return(
            <div key={item.cleaner.id} onClick={function(){setSelected(item.cleaner.id);}}
              className="card" style={{marginBottom:8,border:isTop?"1px solid rgba(255,215,0,.3)":"1px solid "+C.border,background:isTop?"rgba(255,215,0,.04)":C.card,cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{fontSize:20,width:28,textAlign:"center",flexShrink:0}}>{medals[i]||("#"+(i+1))}</div>
                <div style={{width:38,height:38,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#FFF",flexShrink:0}}>
                  {item.cleaner.avatar}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.cleaner.name}</div>
                  <div style={{fontSize:10,color:C.muted}}>{item.cleaner.role==="primary"?"⭐ Primary":"Backup"} · Joined {item.cleaner.joinedAt?new Date(item.cleaner.joinedAt).toLocaleDateString("en-US",{month:"short",year:"numeric"}):""}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontFamily:"Arial Black,sans-serif",fontSize:16,fontWeight:900,color:isTop?"#FFD700":"#CC0000"}}>{metricVal(item)}</div>
                  {metric!=="speed"&&<div style={{fontSize:9,color:C.muted,marginTop:1}}>{period==="alltime"?"all time":period==="month"?"this month":"this week"}</div>}
                </div>
              </div>
              {/* Stat bar */}
              <div style={{background:"#2A2A2A",borderRadius:4,height:5,overflow:"hidden"}}>
                <div style={{background:isTop?"linear-gradient(90deg,#CC0000,#FF4444)":"#CC0000",height:"100%",borderRadius:4,width:pct+"%",transition:"width .5s"}}/>
              </div>
              {/* Mini stats */}
              <div style={{display:"flex",gap:12,marginTop:8}}>
                <div style={{fontSize:10,color:C.muted}}><span style={{color:C.offWhite,fontWeight:600}}>${item.earned}</span> earned</div>
                <div style={{fontSize:10,color:C.muted}}><span style={{color:C.offWhite,fontWeight:600}}>{item.jobs}</span> jobs</div>
                <div style={{fontSize:10,color:C.muted}}><span style={{color:C.offWhite,fontWeight:600}}>★{item.rating.toFixed(1)}</span> rating</div>
                {item.avgMins>0&&<div style={{fontSize:10,color:C.muted}}><span style={{color:C.offWhite,fontWeight:600}}>{item.avgMins}m</span> avg</div>}
              </div>
            </div>
          );
        })}
      </div>

      {ranked.every(function(r){return r.jobs===0;})&&(
        <div className="card" style={{textAlign:"center",padding:30}}>
          <div style={{fontSize:36,marginBottom:10}}>🏆</div>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:14,fontWeight:900,marginBottom:6}}>NO DATA YET</div>
          <div style={{fontSize:12,color:C.muted}}>Rankings will appear once jobs are approved.</div>
        </div>
      )}
      </div>
      )}
    </div>
  );
}


// ─── REPORTS ────────────────────────────────────────────────────────────────
function Reports({jobs,props,cleaners}){
  var [tab,setTab]=useState("overview");
  var [monthOffset,setMonthOffset]=useState(0);
  var [selectedCleaner,setSelectedCleaner]=useState(null);
  var [selectedProp,setSelectedProp]=useState(null);
  var [openMonth,setOpenMonth]=useState(null);

  function exportPDF(currentTab,month,year,mJobs,pJobs,mEarnings,earningsDiff,cStats,pStats,cData,cleanerList,propList){
    var totalEarned=mEarnings;
    var prevEarned=pJobs.reduce(function(s,j){return s+j.pay;},0);
    var allTime=jobs.filter(function(j){return j.status==="approved";}).reduce(function(s,j){return s+j.pay;},0);

    var html="<!DOCTYPE html><html><head><meta charset=UTF-8>";
    html+="<title>TurnReady Report — "+month+" "+year+"</title>";
    html+="<style>";
    html+="*{margin:0;padding:0;box-sizing:border-box;}";
    html+="body{font-family:Arial,sans-serif;background:#FFF;color:#111;padding:40px;}";
    html+=".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:16px;border-bottom:3px solid #CC0000;}";
    html+=".logo{font-size:28px;font-weight:900;letter-spacing:2px;color:#CC0000;}";
    html+=".sub{font-size:13px;color:#666;margin-top:4px;}";
    html+=".section{margin-bottom:28px;}";
    html+=".section-title{font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#CC0000;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #EEE;}";
    html+=".grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}";
    html+=".stat{background:#F8F8F8;border:1px solid #EEE;border-radius:8px;padding:14px;text-align:center;}";
    html+=".stat-val{font-size:22px;font-weight:900;color:#CC0000;display:block;margin-bottom:4px;}";
    html+=".stat-lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;}";
    html+=".table{width:100%;border-collapse:collapse;margin-bottom:16px;}";
    html+=".table th{background:#CC0000;color:#FFF;padding:8px 12px;text-align:left;font-size:11px;font-weight:700;letter-spacing:.5px;}";
    html+=".table td{padding:8px 12px;border-bottom:1px solid #EEE;font-size:12px;}";
    html+=".table tr:nth-child(even) td{background:#FAFAFA;}";
    html+=".bar{background:#EEE;height:6px;border-radius:3px;overflow:hidden;margin-top:4px;}";
    html+=".bar-fill{background:#CC0000;height:100%;border-radius:3px;}";
    html+=".footer{margin-top:40px;padding-top:16px;border-top:1px solid #EEE;font-size:10px;color:#AAA;text-align:center;}";
    html+=".badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;}";
    html+=".green{background:#DCFCE7;color:#16A34A;} .red{background:#FEE2E2;color:#DC2626;}";
    html+="@media print{body{padding:20px;}@page{margin:1cm;}}";
    html+="</style></head><body>";

    // Header
    html+="<div class=header>";
    html+="<div><div class=logo>TURNREADY</div><div class=sub>Harvey's Professional Cleaning LLC</div></div>";
    html+="<div style='text-align:right'><div style='font-size:16px;font-weight:700'>"+month+" "+year+" Report</div>";
    html+="<div style='font-size:12px;color:#666;margin-top:4px'>Generated "+new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})+"</div></div>";
    html+="</div>";

    // Overview stats
    html+="<div class=section>";
    html+="<div class=section-title>Monthly Overview</div>";
    html+="<div class=grid>";
    html+="<div class=stat><span class=stat-val>$"+totalEarned+"</span><div class=stat-lbl>Revenue</div><div style='font-size:11px;margin-top:4px' class='"+(earningsDiff>=0?"green":"red")+" badge'>"+(earningsDiff>=0?"↑":"↓")+Math.abs(earningsDiff)+"% vs prev</div></div>";
    html+="<div class=stat><span class=stat-val>"+mJobs.length+"</span><div class=stat-lbl>Jobs Done</div><div style='font-size:11px;margin-top:4px;color:#888'>vs "+pJobs.length+" last month</div></div>";
    html+="<div class=stat><span class=stat-val>"+(mJobs.length>0?"$"+Math.round(totalEarned/mJobs.length):"$0")+"</span><div class=stat-lbl>Avg Per Job</div></div>";
    html+="<div class=stat><span class=stat-val>$"+allTime+"</span><div class=stat-lbl>All-Time Total</div></div>";
    html+="</div></div>";

    // Cleaner performance table
    html+="<div class=section><div class=section-title>Cleaner Performance</div>";
    html+="<table class=table><thead><tr><th>#</th><th>Cleaner</th><th>Jobs</th><th>Earned</th><th>Rating</th></tr></thead><tbody>";
    cStats.forEach(function(item,i){
      html+="<tr><td>"+(i+1)+"</td><td>"+item.cleaner.name+"</td><td>"+item.jobs+"</td><td>$"+item.earned+"</td><td>★"+item.cleaner.rating.toFixed(1)+"</td></tr>";
    });
    html+="</tbody></table></div>";

    // Property performance table
    html+="<div class=section><div class=section-title>Property Performance</div>";
    html+="<table class=table><thead><tr><th>Property</th><th>Jobs</th><th>Earned</th><th>All-Time</th></tr></thead><tbody>";
    pStats.forEach(function(item){
      html+="<tr><td>"+item.prop.name+"</td><td>"+item.jobs+"</td><td>$"+item.earned+"</td><td>$"+item.allTimeEarned+"</td></tr>";
    });
    html+="</tbody></table></div>";

    // 6-month trends
    html+="<div class=section><div class=section-title>6-Month Trend</div>";
    html+="<table class=table><thead><tr><th>Month</th><th>Jobs</th><th>Revenue</th></tr></thead><tbody>";
    cData.slice().reverse().forEach(function(d){
      html+="<tr><td>"+d.month+"</td><td>"+d.jobs+"</td><td>$"+d.earnings+"</td></tr>";
    });
    html+="</tbody></table></div>";

    // Footer
    html+="<div class=footer>TurnReady — Harvey's Professional Cleaning LLC · Report generated "+new Date().toISOString().split("T")[0]+"</div>";
    html+="</body></html>";

    // Open in new window and print
    var win=window.open("","_blank","width=900,height=700");
    win.document.write(html);
    win.document.close();
    win.onload=function(){win.print();};
  }

  var now=new Date();
  var targetDate=new Date(now.getFullYear(),now.getMonth()-monthOffset,1);
  var targetMonth=targetDate.getMonth();
  var targetYear=targetDate.getFullYear();
  var monthNames=["January","February","March","April","May","June","July","August","September","October","November","December"];

  // Filter jobs for selected month
  var monthJobs=jobs.filter(function(j){
    if(j.status!=="approved")return false;
    var d=new Date(j.paidAt||j.completedAt);
    return d.getMonth()===targetMonth&&d.getFullYear()===targetYear;
  });

  var allApproved=jobs.filter(function(j){return j.status==="approved";});

  // Monthly earnings
  var monthEarnings=monthJobs.reduce(function(s,j){return s+j.pay;},0);
  var prevJobs=jobs.filter(function(j){
    if(j.status!=="approved")return false;
    var d=new Date(j.paidAt||j.completedAt);
    var prev=new Date(targetDate.getFullYear(),targetDate.getMonth()-1,1);
    return d.getMonth()===prev.getMonth()&&d.getFullYear()===prev.getFullYear();
  });
  var prevEarnings=prevJobs.reduce(function(s,j){return s+j.pay;},0);
  var earningsDiff=prevEarnings>0?Math.round(((monthEarnings-prevEarnings)/prevEarnings)*100):0;

  // Per cleaner stats for month
  var cleanerStats=cleaners.map(function(c){
    var cJobs=monthJobs.filter(function(j){return j.cleanerId===c.id;});
    var total=cJobs.reduce(function(s,j){return s+j.pay;},0);
    return {cleaner:c,jobs:cJobs.length,earned:total};
  }).sort(function(a,b){return b.earned-a.earned;});

  // Per property stats for month
  var propStats=props.map(function(p){
    var pJobs=monthJobs.filter(function(j){return j.propertyId===p.id||j.propertyName===p.name;});
    var total=pJobs.reduce(function(s,j){return s+j.pay;},0);
    var allTime=allApproved.filter(function(j){return j.propertyId===p.id||j.propertyName===p.name;});
    return {prop:p,jobs:pJobs.length,earned:total,allTimeJobs:allTime.length,allTimeEarned:allTime.reduce(function(s,j){return s+j.pay;},0)};
  }).sort(function(a,b){return b.earned-a.earned;});

  // Last 6 months chart data
  var chartData=[];
  for(var mi=5;mi>=0;mi--){
    var cd=new Date(now.getFullYear(),now.getMonth()-mi,1);
    var cJobs=allApproved.filter(function(j){
      var d=new Date(j.paidAt||j.completedAt);
      return d.getMonth()===cd.getMonth()&&d.getFullYear()===cd.getFullYear();
    });
    chartData.push({
      month:monthNames[cd.getMonth()].slice(0,3),
      monthIdx:cd.getMonth(),
      year:cd.getFullYear(),
      earnings:cJobs.reduce(function(s,j){return s+j.pay;},0),
      jobs:cJobs.length
    });
  }
  var maxEarnings=Math.max.apply(null,chartData.map(function(d){return d.earnings;}));

  return(
    <div style={{fontFamily:"Inter,sans-serif"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1}}>REPORTS</div>
        <button onClick={function(){exportPDF(tab,monthNames[targetMonth],targetYear,monthJobs,prevJobs,monthEarnings,earningsDiff,cleanerStats,propStats,chartData,cleaners,props);}}
          style={{background:"#CC0000",border:"none",borderRadius:8,padding:"8px 14px",color:"#FFF",fontSize:11,fontWeight:900,cursor:"pointer",fontFamily:"Arial Black,sans-serif",letterSpacing:.5,display:"flex",alignItems:"center",gap:6}}>
          📄 EXPORT PDF
        </button>
      </div>

      {/* Month selector */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,background:"#141414",borderRadius:10,padding:"10px 14px",border:"1px solid #2A2A2A"}}>
        <button onClick={function(){setMonthOffset(monthOffset+1);}} style={{background:"none",border:"none",color:"#FFF",fontSize:18,cursor:"pointer",padding:"0 8px"}}>{"<"}</button>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:15,fontWeight:900}}>{monthNames[targetMonth]} {targetYear}</div>
          {monthOffset===0&&<div style={{fontSize:10,color:"#CC0000",fontWeight:700}}>CURRENT MONTH</div>}
        </div>
        <button onClick={function(){if(monthOffset>0)setMonthOffset(monthOffset-1);}} style={{background:"none",border:"none",color:monthOffset>0?"#FFF":"#333",fontSize:18,cursor:monthOffset>0?"pointer":"default",padding:"0 8px"}}>{">"}</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {[["overview","Overview"],["cleaners","Cleaners"],["properties","Properties"],["chart","Trends"]].map(function(t){return(
          <button key={t[0]} onClick={function(){setTab(t[0]);}}
            style={{flex:1,padding:"7px 4px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"Arial Black,sans-serif",letterSpacing:.3,
              background:tab===t[0]?"#CC0000":"transparent",
              borderColor:tab===t[0]?"#CC0000":"#333",
              color:tab===t[0]?"#FFF":"#888"}}>
            {t[1]}
          </button>
        );})}
      </div>

      {/* Overview Tab */}
      {tab==="overview"&&(
        <div>
          {/* Key metrics */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div className="card" style={{textAlign:"center",cursor:"pointer"}} onClick={function(){setTab("chart");}}>
              <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:.3,marginBottom:6}}>Revenue</div>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:26,fontWeight:900,color:"#22C55E"}}>${monthEarnings}</div>
              <div style={{fontSize:11,marginTop:4,color:earningsDiff>=0?"#22C55E":"#EF4444",fontWeight:700}}>
                {earningsDiff>=0?"↑":"↓"} {Math.abs(earningsDiff)}% vs last month
              </div>
              <div style={{fontSize:9,color:"#444",marginTop:4}}>Tap → Trends</div>
            </div>
            <div className="card" style={{textAlign:"center",cursor:"pointer"}} onClick={function(){setTab("cleaners");}}>
              <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:.3,marginBottom:6}}>Jobs Done</div>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:26,fontWeight:900,color:"#CC0000"}}>{monthJobs.length}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:4}}>vs {prevJobs.length} last month</div>
              <div style={{fontSize:9,color:"#444",marginTop:4}}>Tap → Cleaners</div>
            </div>
            <div className="card" style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:.3,marginBottom:6}}>Avg Per Job</div>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:26,fontWeight:900,color:"#F59E0B"}}>${monthJobs.length>0?Math.round(monthEarnings/monthJobs.length):0}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:4}}>per cleaning</div>
            </div>
            <div className="card" style={{textAlign:"center",cursor:"pointer"}} onClick={function(){setTab("properties");}}>
              <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:.3,marginBottom:6}}>Active Props</div>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:26,fontWeight:900,color:"#3B82F6"}}>{props.length}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:4}}>{cleaners.length} cleaners</div>
            </div>
          </div>
          {/* All time totals */}
          <div className="card">
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:12,color:C.muted}}>ALL TIME</div>
            {[
              ["Total Revenue","$"+allApproved.reduce(function(s,j){return s+j.pay;},0).toLocaleString(),"#22C55E"],
              ["Total Jobs",allApproved.length+" completed","#CC0000"],
              ["Properties",props.length+" active","#3B82F6"],
              ["Team Size",cleaners.length+" cleaners","#F59E0B"],
            ].map(function(item){return(
              <div key={item[0]} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #222"}}>
                <div style={{fontSize:13,color:C.muted}}>{item[0]}</div>
                <div style={{fontSize:14,fontWeight:700,color:item[2]}}>{item[1]}</div>
              </div>
            );})}
          </div>
        </div>
      )}

      {/* Cleaners Tab */}
      {tab==="cleaners"&&(
        <div>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:12,color:C.muted}}>
            CLEANER PERFORMANCE — {monthNames[targetMonth].toUpperCase()}
          </div>
          {cleanerStats.filter(function(c){return c.jobs>0;}).length===0&&(
            <div className="card" style={{textAlign:"center",padding:30,color:C.muted}}>No jobs this month</div>
          )}
          {cleanerStats.map(function(item,i){
            var maxEarned=cleanerStats[0]?cleanerStats[0].earned:1;
            return(
              <div key={item.cleaner.id} className="card" style={{marginBottom:10,opacity:item.jobs===0?.4:1,cursor:"pointer",border:"1px solid "+(selectedCleaner&&selectedCleaner.id===item.cleaner.id?"#CC0000":"transparent"),transition:"border .2s"}}
                onClick={function(){setSelectedCleaner(selectedCleaner&&selectedCleaner.id===item.cleaner.id?null:item.cleaner);}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:item.jobs>0?10:0}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#FFF",flexShrink:0,overflow:"hidden"}}>
                    {item.cleaner.photo?<img src={item.cleaner.photo} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:item.cleaner.avatar}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:selectedCleaner&&selectedCleaner.id===item.cleaner.id?"#CC0000":"#FFF"}}>{item.cleaner.name}</div>
                    <div style={{fontSize:11,color:C.muted}}>{item.jobs} job{item.jobs!==1?"s":""} · ★{(item.cleaner.rating||5).toFixed(1)} · ${item.earned} this month</div>
                  </div>
                  <div style={{color:"#555",fontSize:12}}>{selectedCleaner&&selectedCleaner.id===item.cleaner.id?"▲":"▼"}</div>
                </div>
                {item.jobs>0&&maxEarned>0&&(
                  <div style={{background:"#2A2A2A",borderRadius:6,height:6,marginBottom:selectedCleaner&&selectedCleaner.id===item.cleaner.id?10:0}}>
                    <div style={{background:"#22C55E",height:6,borderRadius:6,width:Math.round((item.earned/maxEarned)*100)+"%",transition:"width .5s"}}/>
                  </div>
                )}
                {/* Expanded detail */}
                {selectedCleaner&&selectedCleaner.id===item.cleaner.id&&(function(){
                  var clJobs=monthJobs.filter(function(j){return j.cleanerId===item.cleaner.id;});
                  var allTimeJobs=jobs.filter(function(j){return j.cleanerId===item.cleaner.id&&j.status==="approved";});
                  return(
                    <div style={{borderTop:"1px solid #2A2A2A",paddingTop:10}}>
                      {/* Stats row */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
                        {[
                          {label:"This Month",val:item.jobs+" jobs"},
                          {label:"All Time",val:allTimeJobs.length+" jobs"},
                          {label:"Total Earned",val:"$"+allTimeJobs.reduce(function(s,j){return s+j.pay;},0)},
                          {label:"Avg Rating",val:"★ "+(item.cleaner.rating||5).toFixed(1)},
                          {label:"Completion",val:item.jobs>0?Math.round((item.jobs/Math.max(item.jobs,1))*100)+"%":"—"},
                          {label:"Last Job",val:clJobs.length>0?new Date(clJobs[clJobs.length-1].date||Date.now()).toLocaleDateString([],{month:"short",day:"numeric"}):"—"},
                        ].map(function(s){return(
                          <div key={s.label} style={{background:"#1A1A1A",borderRadius:6,padding:"8px",textAlign:"center"}}>
                            <div style={{fontSize:11,fontWeight:700,color:"#FFF"}}>{s.val}</div>
                            <div style={{fontSize:9,color:C.muted,marginTop:2}}>{s.label}</div>
                          </div>
                        );})}
                      </div>
                      {/* This month's jobs */}
                      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:.5,marginBottom:6}}>THIS MONTH&apos;S JOBS</div>
                      {clJobs.length===0&&<div style={{fontSize:11,color:"#555",marginBottom:8}}>No jobs this month</div>}
                      {clJobs.map(function(j){
                        var prop=(props||[]).find(function(p){return p.id===j.propertyId;})||{name:"Property"};
                        return(
                          <div key={j.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #1A1A1A"}}>
                            <div>
                              <div style={{fontSize:12,fontWeight:600}}>{prop.name}</div>
                              <div style={{fontSize:10,color:C.muted}}>{j.date||"—"}</div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:12,fontWeight:700,color:"#22C55E"}}>${j.pay}</div>
                              <div style={{fontSize:9,color:j.status==="approved"?"#22C55E":j.status==="rejected"?"#EF4444":"#F59E0B"}}>{j.status}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Properties Tab */}
      {tab==="properties"&&(
        <div>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:12,color:C.muted}}>
            PROPERTY PERFORMANCE — {monthNames[targetMonth].toUpperCase()}
          </div>
          {propStats.map(function(item){
            var cl=cleaners.find(function(c){return c.id===item.prop.assignedTo;})||{name:"Unassigned"};
            return(
              <div key={item.prop.id} className="card" style={{marginBottom:10,cursor:"pointer",border:"1px solid "+(selectedProp&&selectedProp.id===item.prop.id?"#CC0000":"transparent"),transition:"border .2s"}}
                onClick={function(){setSelectedProp(selectedProp&&selectedProp.id===item.prop.id?null:item.prop);}}>
                <div style={{display:"flex",gap:10,marginBottom:8}}>
                  <div style={{width:50,height:50,borderRadius:8,overflow:"hidden",flexShrink:0,background:"#1A1A1A",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {item.prop.photo?<img src={item.prop.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:20,opacity:.4}}>🏠</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:2,color:selectedProp&&selectedProp.id===item.prop.id?"#CC0000":"#FFF"}}>{item.prop.name}</div>
                    <div style={{fontSize:11,color:C.muted}}>{item.jobs} job{item.jobs!==1?"s":""} · ${item.earned} this month</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{fontFamily:"Arial Black,sans-serif",fontSize:15,fontWeight:900,color:"#22C55E"}}>${item.allTimeEarned}</div>
                    <div style={{color:"#555",fontSize:12}}>{selectedProp&&selectedProp.id===item.prop.id?"▲":"▼"}</div>
                  </div>
                </div>
                {/* Expanded detail */}
                {selectedProp&&selectedProp.id===item.prop.id&&(function(){
                  var propJobs=monthJobs.filter(function(j){return j.propertyId===item.prop.id;});
                  return(
                    <div style={{borderTop:"1px solid #2A2A2A",paddingTop:10}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
                        {[
                          {label:"This Month",val:item.jobs+" jobs"},
                          {label:"All Time",val:item.allTimeJobs+" jobs"},
                          {label:"Total Revenue",val:"$"+item.allTimeEarned},
                          {label:"Avg Per Job",val:item.allTimeJobs>0?"$"+Math.round(item.allTimeEarned/item.allTimeJobs):"—"},
                          {label:"Bedrooms",val:(item.prop.bedrooms||"—")+" bd"},
                          {label:"Turnover",val:item.prop.sameDay?"Same-Day":"Standard"},
                        ].map(function(s){return(
                          <div key={s.label} style={{background:"#1A1A1A",borderRadius:6,padding:"8px",textAlign:"center"}}>
                            <div style={{fontSize:11,fontWeight:700,color:"#FFF"}}>{s.val}</div>
                            <div style={{fontSize:9,color:C.muted,marginTop:2}}>{s.label}</div>
                          </div>
                        );})}
                      </div>
                      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:.5,marginBottom:6}}>THIS MONTH&apos;S JOBS</div>
                      {propJobs.length===0&&<div style={{fontSize:11,color:"#555",marginBottom:8}}>No jobs this month</div>}
                      {propJobs.map(function(j){
                        var cln=(cleaners||[]).find(function(c){return c.id===j.cleanerId;})||{name:"Unknown"};
                        return(
                          <div key={j.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #1A1A1A"}}>
                            <div>
                              <div style={{fontSize:12,fontWeight:600}}>{cln.name}</div>
                              <div style={{fontSize:10,color:C.muted}}>{j.date||"—"}</div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:12,fontWeight:700,color:"#22C55E"}}>${j.pay}</div>
                              <div style={{fontSize:9,color:j.status==="approved"?"#22C55E":j.status==="rejected"?"#EF4444":"#F59E0B"}}>{j.status}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Trends Chart Tab */}
      {tab==="chart"&&(
        <div>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:4,color:C.muted}}>6-MONTH EARNINGS TREND</div>
          <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Monthly revenue over the last 6 months</div>
          <div className="card" style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"flex-end",gap:8,height:140,paddingBottom:4}}>
              {chartData.map(function(d,i){
                var barH=maxEarnings>0?Math.round((d.earnings/maxEarnings)*120):0;
                var isCurrent=i===5&&monthOffset===0;
                return(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    {d.earnings>0&&<div style={{fontSize:9,color:"#22C55E",fontWeight:700}}>${d.earnings}</div>}
                    <div style={{width:"100%",background:isCurrent?"#CC0000":"#22C55E",borderRadius:"4px 4px 0 0",height:barH||4,minHeight:4,transition:"height .5s",opacity:isCurrent?1:.7}}/>
                    <div style={{fontSize:9,color:isCurrent?"#CC0000":C.muted,fontWeight:isCurrent?700:400}}>{d.month}</div>
                    {d.jobs>0&&<div style={{fontSize:8,color:C.muted}}>{d.jobs}j</div>}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Monthly breakdown table */}
          <div className="card">
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:10,color:C.muted}}>MONTHLY BREAKDOWN</div>
            {chartData.slice().reverse().map(function(d,i){
              return(
                <div key={i}>
                  <div onClick={function(){setOpenMonth(openMonth===i?null:i);}}
                    style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #222",cursor:d.jobs>0?"pointer":"default"}}>
                    <div style={{fontSize:13,fontWeight:i===0?700:400,color:i===0?"#FFF":C.muted,display:"flex",alignItems:"center",gap:6}}>
                      {d.month}
                      {d.jobs>0&&<span style={{fontSize:9,color:"#444"}}>{openMonth===i?"▲":"▼"}</span>}
                    </div>
                    <div style={{display:"flex",gap:16,alignItems:"center"}}>
                      <span style={{fontSize:12,color:C.muted}}>{d.jobs} job{d.jobs!==1?"s":""}</span>
                      <span style={{fontSize:13,fontWeight:700,color:"#22C55E",minWidth:50,textAlign:"right"}}>${d.earnings}</span>
                    </div>
                  </div>
                  {openMonth===i&&d.jobs>0&&(function(){
                    var monthJobsList=allApproved.filter(function(j){
                      var jd=new Date(j.date||j.completedAt||Date.now());
                      return jd.getMonth()===d.monthIdx&&jd.getFullYear()===d.year;
                    });
                    return monthJobsList.map(function(j){
                      var cln=(cleaners||[]).find(function(c){return c.id===j.cleanerId;})||{name:"Cleaner"};
                      var prp=(props||[]).find(function(p){return p.id===j.propertyId;})||{name:"Property"};
                      return(
                        <div key={j.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0 6px 12px",borderBottom:"1px solid #111",background:"#0D0D0D"}}>
                          <div>
                            <div style={{fontSize:11,fontWeight:600}}>{prp.name}</div>
                            <div style={{fontSize:10,color:"#666"}}>{cln.name} · {j.date||"—"}</div>
                          </div>
                          <div style={{fontSize:12,fontWeight:700,color:"#22C55E"}}>${j.pay}</div>
                        </div>
                      );
                    });
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


function Info({user,managerPolicy,setManagerPolicy}){
  const [tab,setTab]=useState("how");
  const [openFaq,setOpenFaq]=useState(null);
  const [openPolicy,setOpenPolicy]=useState(null);
  const [editingPolicy,setEditingPolicy]=useState(false);
  const [editSec,setEditSec]=useState(null);
  const [editingTab,setEditingTab]=useState(false);
  const [editField,setEditField]=useState(null);
  const [phoneAction,setPhoneAction]=useState(null);

  // Determine which policy to show
  var isManager=user&&user.role==="manager";
  // managerPolicy can be an object with __keys mixed in with array items
  // Extract only the array portion (numeric-indexed items) for policy sections
  var activePolicies=(function(){
    if(!managerPolicy)return user&&user.id==="mgr1"?POLICIES:TEMPLATE_POLICIES;
    if(Array.isArray(managerPolicy))return managerPolicy;
    // managerPolicy is an object - extract array items (those with num/title/content)
    var arr=Object.values(managerPolicy).filter(function(v){return v&&typeof v==="object"&&v.num;});
    if(arr.length)return arr;
    return user&&user.id==="mgr1"?POLICIES:TEMPLATE_POLICIES;
  })();

  // Default How To Use steps for managers
  var defaultHowToSteps=[
    {icon:"🏠",title:"Add Your Properties",body:"Go to Properties and tap '+ Add Property'. Enter the name, address, bedrooms, bathrooms, total beds (mattresses), and check-in/check-out times. Upload a cover photo and set it as Same-Day or Standard turnover. Tap the address to get directions anytime."},
    {icon:"📋",title:"Set Up Tasks & Checklist",body:"Inside each property tap Tasks. Your master checklist is already loaded with 7 sections from Arrival to Departure. Drag tasks to reorder them. Tap any section name to rename it. Add new tasks or sections as needed for that property."},
    {icon:"🏷️",title:"Set Up Rooms",body:"Tap Rooms inside a property to add each room — living room, bedrooms, bathrooms, kitchen. Add an icon, staging guide, and reference photos so cleaners know exactly how each room should look when done."},
    {icon:"👥",title:"Build Your Team",body:"Go to Team and share your invite code (HARVEY2024) with your cleaners. Once they sign up you can assign jobs to any cleaner. View each cleaner's ratings, job history, and availability from their profile."},
    {icon:"📅",title:"Assign Jobs",body:"Open a property and tap Assign. Choose a cleaner, date, and time. The cleaner gets notified immediately and has 8 hours to accept or decline. If they don\'t respond, the job auto-assigns to the next available cleaner."},
    {icon:"⚠️",title:"Handle Removal Requests",body:"If a cleaner requests to be removed from a job, you\'ll see it in Approvals under Removal Requests with their reason. Tap Approve (removes them), Deny (they must show up), or Reassign (move it to another cleaner)."},
    {icon:"✅",title:"Review & Approve Jobs",body:"When a cleaner submits, go to Approvals. Review their task checklist, inventory status, room videos, and guest rating. Tap Approve to release payment or Reject with a specific reason. Rejected jobs go back to the cleaner to fix and resubmit."},
    {icon:"🔄",title:"Handle Awaiting Response",body:"Approvals shows jobs waiting for cleaner acceptance. Tap Resend to reset the 8-hour timer and re-notify the cleaner. Tap Reassign to move it to a different cleaner. Tap Cancel to remove the slot entirely."},
    {icon:"📊",title:"Track Performance",body:"Check the Leaderboard for team rankings by jobs, earnings, and ratings. Use Reports for payment history and earnings summaries. Use this to reward top performers and spot quality issues early."},
    {icon:"🛠️",title:"Help & Support Settings",body:"Go to Help & Support to edit your policy, Q&A, and contact info for your cleaners. Add your phone, email, Instagram, and website — all are tappable for your cleaners. TurnReady platform support is always at the bottom."},
  ];

  // Default How To Use steps for cleaners
  var defaultCleanerSteps=[
    {icon:"🏠",title:"Check Your Dashboard Daily",body:"Your Home screen shows pending job assignments, rejected jobs that need fixing, upcoming jobs, earnings, and quick tips. Any job needing your attention appears as a banner at the top — never miss it."},
    {icon:"📋",title:"Respond to Job Assignments",body:"When Harvey assigns you a job, a banner appears on your dashboard and you get a bell notification. You have 8 hours to Accept or Decline from My Jobs. Don\'t ignore it — no response means the job moves to another cleaner automatically."},
    {icon:"🧹",title:"Start and Work Your Job",body:"On your job day, open My Jobs, tap the property, and hit TAP TO BEGIN CLEANING. Work through each tab: Tasks (check off as you go), Inventory (mark Full/Med/Low for each supply), Rooms (upload your after-clean video per room), then rate the guest condition."},
    {icon:"📹",title:"Document Every Room",body:"Inside each room tap the big red upload button to record or upload your after-clean video right after cleaning that room. Pre-clean video (optional but recommended) protects you if guests dispute damage. All rooms need a video before submitting."},
    {icon:"📦",title:"Check Inventory",body:"In the Inventory tab mark every item as Full, Med, or Low. This tells Harvey what needs restocking before the next guest. Be accurate — low inventory affects guest experience and your rating."},
    {icon:"✅",title:"Submit for Approval",body:"Once all tasks are checked, inventory is marked, all room videos are uploaded, and you\'ve rated the guest condition — the Submit button turns red. Tap it to send to Harvey for review. You\'ll get notified when it\'s approved and payment is released."},
    {icon:"🔧",title:"Fixing a Rejected Job",body:"If Harvey rejects your job he\'ll give you a specific reason. A red banner appears on your dashboard. Tap it, review Harvey\'s note, fix the issue, and tap RESUBMIT JOB TO HARVEY. No need to redo everything — just fix what was flagged."},
    {icon:"⚠️",title:"Requesting Job Removal",body:"If you need to be removed from an accepted job, open the job in My Jobs before starting it and tap Request Removal From Job. Select your reason. Harvey will approve, deny, or reassign. You remain responsible until he confirms your removal."},
    {icon:"💰",title:"Track Your Earnings",body:"My Earnings shows every payment, payout status, and your total earned. Make sure your Stripe account is connected to receive payments. Payments are released after Harvey approves your submission."},
    {icon:"⭐",title:"Protect Your Rating",body:"Your rating determines your priority for new job assignments. Deliver consistent quality every clean. Check My Ratings to see Harvey\'s feedback after each job. A high rating means more jobs, better properties, and higher pay."},
  ];

  // How To Use content - use saved or default
  var howToSteps=managerPolicy&&managerPolicy.__howTo?managerPolicy.__howTo:(isManager?defaultHowToSteps:defaultCleanerSteps);

  // FAQ content - use saved or default
  var activeFaqs=managerPolicy&&managerPolicy.__faqs?managerPolicy.__faqs:FAQS;

  // Contact info - use saved or default
  // Harvey gets his real info; other managers get placeholders
  var isHarvey=user&&user.id==="mgr1";
  var defaultContact=isManager?(isHarvey?[
    {icon:"📧",label:"Email",value:"harvey@harveysprocleaning.com"},
    {icon:"📱",label:"Text / WhatsApp",value:"(404) 555-0100"},
    {icon:"💻",label:"Website",value:"www.turnready.app"},
    {icon:"📸",label:"Instagram",value:"@harveysprocleaning"},
    {icon:"⏰",label:"Support Hours",value:"Mon–Fri · 9am–6pm EST"},
  ]:[
    {icon:"📧",label:"Email",value:"[your@email.com]"},
    {icon:"📱",label:"Text / WhatsApp",value:"[your phone number]"},
    {icon:"💻",label:"Website",value:"[your website]"},
    {icon:"📸",label:"Instagram",value:"[@yourhandle]"},
    {icon:"⏰",label:"Support Hours",value:"Mon–Fri · 9am–6pm EST"},
  ]):[
    {icon:"📧",label:"Email",value:"harvey@harveysprocleaning.com"},
    {icon:"📱",label:"Text / WhatsApp",value:"(404) 555-0100"},
    {icon:"💻",label:"Website",value:"www.turnready.app"},
    {icon:"⏰",label:"Support Hours",value:"Mon–Fri · 9am–6pm EST"},
  ];
  var activeContact=managerPolicy&&managerPolicy.__contact?managerPolicy.__contact:defaultContact;

  function initHarveyPolicy(){
    if(setManagerPolicy&&!managerPolicy){
      setManagerPolicy(POLICIES.map(function(s){return Object.assign({},s);}));
    }
  }

  function saveField(key,value){
    if(!setManagerPolicy)return;
    setManagerPolicy(function(prev){
      // Keep the array structure intact, add __keys as properties on a wrapper object
      var arr=Array.isArray(prev)?prev.slice():(POLICIES.map(function(s){return Object.assign({},s);}));
      // Preserve existing __keys from prev
      var existingKeys={};
      if(prev&&!Array.isArray(prev)){
        Object.keys(prev).forEach(function(k){if(k.startsWith("__"))existingKeys[k]=prev[k];});
      } else if(prev&&Array.isArray(prev)){
        Object.keys(prev).forEach(function(k){if(k.startsWith("__"))existingKeys[k]=prev[k];});
      }
      // Set the new key
      existingKeys[key]=value;
      // Return array with __keys attached as properties
      var result=arr.slice();
      Object.keys(existingKeys).forEach(function(k){result[k]=existingKeys[k];});
      return result;
    });
    setEditField(null);
    setEditingTab(false);
  }
  return(
    <div>
      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:20,fontWeight:900,letterSpacing:1,marginBottom:16}}>HELP & SUPPORT</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:20}}>
        {[["how","How To Use"],["policy","Policy"],["faq","Q&A"],["contact","Contact"]].map(([k,l])=>(
          <button key={k} className={"tab"+(tab===k?" on":"")} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab==="how"&&(
        <div>
          {isManager&&(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:C.muted}}>Tap Edit to customize what your cleaners see</div>
              <button onClick={function(){setEditingTab(!editingTab);setEditField(null);}}
                style={{background:editingTab?"transparent":"#CC0000",border:"1px solid #CC0000",borderRadius:6,color:editingTab?C.muted:"#FFF",fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>
                {editingTab?"DONE":"EDIT"}
              </button>
            </div>
          )}
          <div className="card" style={{marginBottom:14}}>
            <div style={{fontFamily:"Arial Black,sans-serif",fontWeight:900,fontSize:16,letterSpacing:1,color:C.red,marginBottom:14}}>HOW TO USE TURNREADY</div>
            {(isManager?howToSteps:defaultCleanerSteps).map(function(step,i){return(
              <div key={i} style={{display:"flex",gap:12,marginBottom:14,paddingBottom:14,borderBottom:i<(isManager?howToSteps:defaultCleanerSteps).length-1?"1px solid "+C.border:"none"}}>
                <span style={{fontSize:22,flexShrink:0}}>{step.icon}</span>
                <div style={{flex:1}}>
                  {editingTab&&isManager&&editField&&editField.type==="how"&&editField.i===i?(
                    <div>
                      <input value={editField.title} onChange={function(e){setEditField(function(f){return Object.assign({},f,{title:e.target.value});});}}
                        style={{width:"100%",boxSizing:"border-box",marginBottom:6,fontWeight:700}} placeholder="Step title"/>
                      <textarea value={editField.body} onChange={function(e){setEditField(function(f){return Object.assign({},f,{body:e.target.value});});}}
                        rows={3} style={{width:"100%",boxSizing:"border-box",resize:"none"}} placeholder="Step description"/>
                      <div style={{display:"flex",gap:6,marginTop:6}}>
                        <button onClick={function(){
                          var updated=howToSteps.map(function(s,si){return si===i?{icon:editField.icon,title:editField.title,body:editField.body}:s;});
                          saveField("__howTo",updated);
                        }} style={{flex:1,background:"#CC0000",border:"none",borderRadius:6,color:"#FFF",fontSize:11,fontWeight:700,padding:"7px",cursor:"pointer"}}>Save</button>
                        <button onClick={function(){setEditField(null);}} style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:6,color:"#888",fontSize:11,padding:"7px",cursor:"pointer"}}>Cancel</button>
                      </div>
                    </div>
                  ):(
                    <div>
                      <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,marginBottom:4}}>{step.title}</div>
                      <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{step.body}</div>
                      {editingTab&&isManager&&(
                        <button onClick={function(){setEditField({type:"how",i:i,icon:step.icon,title:step.title,body:step.body});}}
                          style={{background:"transparent",border:"none",color:"#CC0000",fontSize:11,fontWeight:700,cursor:"pointer",padding:"4px 0",marginTop:4}}>✏️ Edit step</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );})}
          </div>
        </div>
      )}

      {tab==="faq"&&(
        <div>
          {isManager&&(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:C.muted}}>Edit questions your cleaners see in Q&A</div>
              <div style={{display:"flex",gap:6}}>
                {editingTab&&(
                  <button onClick={function(){
                    var updated=(activeFaqs||[]).concat([{q:"New Question",a:"Your answer here."}]);
                    saveField("__faqs",updated);
                  }} style={{background:"transparent",border:"1px solid #22C55E",borderRadius:6,color:"#22C55E",fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>+ ADD</button>
                )}
                <button onClick={function(){setEditingTab(!editingTab);setEditField(null);}}
                  style={{background:editingTab?"transparent":"#CC0000",border:"1px solid #CC0000",borderRadius:6,color:editingTab?C.muted:"#FFF",fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>
                  {editingTab?"DONE":"EDIT"}
                </button>
              </div>
            </div>
          )}
          <div className="card" style={{padding:0}}>
            <div style={{padding:"18px 20px",borderBottom:"1px solid "+(C.border),fontFamily:"Arial Black,sans-serif",fontWeight:900,fontSize:18,letterSpacing:1,color:C.red}}>FREQUENTLY ASKED QUESTIONS</div>
            {(activeFaqs||[]).map(function(f,i){return(
              <div key={i} className="faq-item">
                {editingTab&&isManager&&editField&&editField.type==="faq"&&editField.i===i?(
                  <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.border}}>
                    <input value={editField.q} onChange={function(e){setEditField(function(f){return Object.assign({},f,{q:e.target.value});});}}
                      style={{width:"100%",boxSizing:"border-box",marginBottom:6,fontWeight:700}} placeholder="Question"/>
                    <textarea value={editField.a} onChange={function(e){setEditField(function(ff){return Object.assign({},ff,{a:e.target.value});});}}
                      rows={3} style={{width:"100%",boxSizing:"border-box",resize:"none"}} placeholder="Answer"/>
                    <div style={{display:"flex",gap:6,marginTop:6}}>
                      <button onClick={function(){
                        var updated=(activeFaqs||[]).map(function(ff,fi){return fi===i?{q:editField.q,a:editField.a}:ff;});
                        saveField("__faqs",updated);
                      }} style={{flex:1,background:"#CC0000",border:"none",borderRadius:6,color:"#FFF",fontSize:11,fontWeight:700,padding:"7px",cursor:"pointer"}}>Save</button>
                      <button onClick={function(){
                        if(window.confirm&&window.confirm("Delete this question?")){
                          var updated=(activeFaqs||[]).filter(function(_,fi){return fi!==i;});
                          saveField("__faqs",updated);
                        }else{setEditField(null);}
                      }} style={{flex:1,background:"transparent",border:"1px solid #EF4444",borderRadius:6,color:"#EF4444",fontSize:11,padding:"7px",cursor:"pointer"}}>Delete</button>
                      <button onClick={function(){setEditField(null);}} style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:6,color:"#888",fontSize:11,padding:"7px",cursor:"pointer"}}>Cancel</button>
                    </div>
                  </div>
                ):(
                  <div>
                    <div className="faq-q" onClick={function(){setOpenFaq(openFaq===i?null:i);}}>
                      {f.q}<span style={{color:C.red,fontSize:18,transition:"transform .2s",transform:openFaq===i?"rotate(45deg)":"none"}}>+</span>
                    </div>
                    {openFaq===i&&(
                      <div>
                        <div className="faq-a">{f.a}</div>
                        {editingTab&&isManager&&(
                          <button onClick={function(){setEditField({type:"faq",i:i,q:f.q,a:f.a});}}
                            style={{background:"transparent",border:"none",color:"#CC0000",fontSize:11,fontWeight:700,cursor:"pointer",padding:"4px 16px 12px",display:"block"}}>✏️ Edit this Q&A</button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );})}
          </div>
        </div>
      )}

      {tab==="policy"&&(
        <div>
          {/* Manager can edit their policy */}
          {isManager&&(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.5,flex:1,marginRight:10}}>
                {managerPolicy?"Custom policy — tap Edit to modify sections":"Tap Edit to customize any section"}
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                {!managerPolicy&&user&&user.id!=="mgr1"&&(
                  <button onClick={function(){setManagerPolicy&&setManagerPolicy(TEMPLATE_POLICIES.map(function(s){return Object.assign({},s);}));}}
                    style={{background:"transparent",border:"1px solid #CC0000",borderRadius:6,color:"#CC0000",fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>
                    USE TEMPLATE
                  </button>
                )}
                {managerPolicy&&editingPolicy&&(
                  <button onClick={function(){
                    if(user&&user.id==="mgr1"){setManagerPolicy&&setManagerPolicy(null);}
                    else{setManagerPolicy&&setManagerPolicy(TEMPLATE_POLICIES.map(function(s){return Object.assign({},s);}));}
                    setEditingPolicy(false);setEditSec(null);
                  }}
                    style={{background:"transparent",border:"1px solid #444",borderRadius:6,color:"#666",fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>
                    RESET
                  </button>
                )}
                <button onClick={function(){
                  if(!editingPolicy&&!managerPolicy)initHarveyPolicy();
                  setEditingPolicy(!editingPolicy);setEditSec(null);
                }}
                  style={{background:editingPolicy?"transparent":"#CC0000",border:"1px solid #CC0000",borderRadius:6,color:editingPolicy?C.muted:"#FFF",fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>
                  {editingPolicy?"DONE":"EDIT"}
                </button>
              </div>
            </div>
          )}
          {activePolicies.map(function(sec){
            return(
              <div key={sec.num} style={{background:"#1A1A1A",borderRadius:12,marginBottom:10,overflow:"hidden"}}>
                {editingPolicy&&isManager&&(
                  <div style={{padding:"8px 16px",background:"rgba(204,0,0,.08)",borderBottom:"1px solid rgba(204,0,0,.2)"}}>
                    {editSec&&editSec.num===sec.num?(
                      <div>
                        <textarea value={editSec.content} onChange={function(e){setEditSec(function(s){return Object.assign({},s,{content:e.target.value});});}}
                          rows={4} style={{width:"100%",background:"#1A1A1A",border:"1px solid #333",borderRadius:6,color:"#FFF",fontSize:12,padding:"8px 10px",outline:"none",resize:"none",fontFamily:"Inter,sans-serif",lineHeight:1.6,boxSizing:"border-box",marginBottom:8}}/>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={function(){
                            if(setManagerPolicy){
                              setManagerPolicy(function(prev){
                                var base=prev||activePolicies;
                                return base.map(function(s){return s.num===sec.num?Object.assign({},s,{content:editSec.content}):s;});
                              });
                            }
                            setEditSec(null);
                          }} style={{flex:1,background:"#CC0000",border:"none",borderRadius:6,color:"#FFF",fontSize:11,fontWeight:700,padding:"7px",cursor:"pointer"}}>Save</button>
                          <button onClick={function(){setEditSec(null);}} style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:6,color:"#888",fontSize:11,padding:"7px",cursor:"pointer"}}>Cancel</button>
                        </div>
                      </div>
                    ):(
                      <button onClick={function(){setEditSec({num:sec.num,content:sec.content});}}
                        style={{background:"transparent",border:"none",color:"#CC0000",fontSize:11,fontWeight:700,cursor:"pointer",padding:0}}>✏️ Edit this section</button>
                    )}
                  </div>
                )}
                <div onClick={function(){setOpenPolicy(openPolicy===sec.num?null:sec.num);}}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer"}}>
                  <div style={{width:26,height:26,borderRadius:6,background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#FFF",flexShrink:0}}>{sec.num}</div>
                  <div style={{flex:1,fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.3}}>{sec.title}</div>
                  <div style={{color:"#CC0000",fontSize:16,fontWeight:700}}>{openPolicy===sec.num?"▲":"▼"}</div>
                </div>
                {openPolicy===sec.num&&(
                  <div style={{padding:"0 16px 16px",borderTop:"1px solid #2A2A2A"}}>
                    {sec.content&&<div style={{fontSize:12,color:"#CCC",lineHeight:1.7,marginTop:12,marginBottom:sec.items.length?10:0}}>{sec.content}</div>}
                    {sec.items.map(function(item,i){
                      return(
                        <div key={i} style={{display:"flex",gap:8,marginTop:8}}>
                          <span style={{color:"#CC0000",fontSize:12,flexShrink:0,marginTop:1}}>→</span>
                          <span style={{fontSize:12,color:"#CCC",lineHeight:1.6}}>{item}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {tab==="contact"&&(
        <div>
          {isManager&&(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:C.muted}}>Update your contact info for cleaners</div>
              <button onClick={function(){setEditingTab(!editingTab);setEditField(null);}}
                style={{background:editingTab?"transparent":"#CC0000",border:"1px solid #CC0000",borderRadius:6,color:editingTab?C.muted:"#FFF",fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>
                {editingTab?"DONE":"EDIT"}
              </button>
            </div>
          )}
          <div className="card">
            <div style={{fontFamily:"Arial Black,sans-serif",fontWeight:900,fontSize:16,letterSpacing:1,color:C.red,marginBottom:16}}>CONTACT & SUPPORT</div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
              {(activeContact||[]).map(function(item,i){return(
                <div key={item.label} style={{padding:"12px",background:C.surface,borderRadius:10}}>
                  {editingTab&&isManager&&editField&&editField.type==="contact"&&editField.i===i?(
                    <div>
                      <div style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
                        <input value={editField.icon} onChange={function(e){setEditField(function(f){return Object.assign({},f,{icon:e.target.value});});}}
                          style={{width:48,textAlign:"center",fontSize:18}} placeholder="📧"/>
                        <input value={editField.label} onChange={function(e){setEditField(function(f){return Object.assign({},f,{label:e.target.value});});}}
                          style={{flex:1,boxSizing:"border-box",fontSize:11,fontWeight:700}} placeholder="Label"/>
                      </div>
                      <input value={editField.value} onChange={function(e){setEditField(function(f){return Object.assign({},f,{value:e.target.value});});}}
                        style={{width:"100%",boxSizing:"border-box"}} placeholder="Value"/>
                      <div style={{display:"flex",gap:6,marginTop:6}}>
                        <button onClick={function(){
                          var updated=(activeContact||[]).map(function(c,ci){return ci===i?{icon:editField.icon,label:editField.label,value:editField.value}:c;});
                          saveField("__contact",updated);
                        }} style={{flex:1,background:"#CC0000",border:"none",borderRadius:6,color:"#FFF",fontSize:11,fontWeight:700,padding:"7px",cursor:"pointer"}}>Save</button>
                        <button onClick={function(){setEditField(null);}} style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:6,color:"#888",fontSize:11,padding:"7px",cursor:"pointer"}}>Cancel</button>
                      </div>
                    </div>
                  ):(
                    <div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div style={{flex:1}} onClick={function(){
                          var v=item.value||"";
                          var lbl=(item.label||"").toLowerCase();
                          var href=null;
                          if(lbl.includes("email")||v.includes("@")){href="mailto:"+v;}
                          else if(lbl.includes("whatsapp")||lbl.includes("text")||lbl.includes("phone")){
                            // Show action sheet instead of direct link
                            setPhoneAction({value:v,label:item.label});
                            return;
                          }
                          else if(lbl.includes("instagram")||v.startsWith("@")){
                            href="https://instagram.com/"+(v.startsWith("@")?v.slice(1):v);
                          }
                          else if(lbl.includes("website")||v.includes("www.")||v.includes(".app")||v.includes(".com")){
                            href=(v.startsWith("http")?"":"https://")+v;
                          }
                          else if(lbl.includes("facebook")){href="https://facebook.com/"+v;}
                          else if(lbl.includes("twitter")||lbl.includes("x.")){href="https://twitter.com/"+(v.startsWith("@")?v.slice(1):v);}
                          if(href){window.open(href,"_blank");}
                        }} style={{cursor:"pointer"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                            <span style={{fontSize:16}}>{item.icon}</span>
                            <span style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{item.label}</span>
                            {(function(){
                              var v=item.value||"";var lbl=(item.label||"").toLowerCase();
                              var isLink=lbl.includes("email")||v.includes("@")||lbl.includes("whatsapp")||lbl.includes("text")||lbl.includes("phone")||lbl.includes("instagram")||v.startsWith("@")||lbl.includes("website")||v.includes("www.")||v.includes(".app")||v.includes(".com");
                              return isLink?<span style={{fontSize:9,color:"#CC0000",marginLeft:2}}>↗</span>:null;
                            })()}
                          </div>
                          <div style={{fontSize:13,color:"#CC0000",fontWeight:500,paddingLeft:24,wordBreak:"break-all",textDecoration:"underline",textDecorationStyle:"dotted",textUnderlineOffset:2}}>{item.value}</div>
                        </div>
                        {editingTab&&isManager&&(
                          <button onClick={function(e){e.stopPropagation();setEditField({type:"contact",i:i,icon:item.icon,label:item.label,value:item.value});}}
                            style={{background:"transparent",border:"none",color:"#CC0000",fontSize:11,fontWeight:700,cursor:"pointer",padding:"4px 8px",flexShrink:0}}>✏️</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );})}
            </div>
            {/* Editable bottom note */}
            {editingTab&&isManager&&editField&&editField.type==="note"?(
              <div>
                <textarea value={editField.value} onChange={function(e){setEditField(function(f){return Object.assign({},f,{value:e.target.value});});}}
                  rows={3} style={{width:"100%",boxSizing:"border-box",resize:"none",borderRadius:8}} placeholder="Support note for cleaners..."/>
                <div style={{display:"flex",gap:6,marginTop:6}}>
                  <button onClick={function(){saveField("__contactNote",editField.value);}}
                    style={{flex:1,background:"#CC0000",border:"none",borderRadius:6,color:"#FFF",fontSize:11,fontWeight:700,padding:"7px",cursor:"pointer"}}>Save</button>
                  <button onClick={function(){setEditField(null);}} style={{flex:1,background:"transparent",border:"1px solid #444",borderRadius:6,color:"#888",fontSize:11,padding:"7px",cursor:"pointer"}}>Cancel</button>
                </div>
              </div>
            ):(
              <div style={{background:"rgba(204,0,0,.06)",border:"1px solid rgba(204,0,0,.2)",borderRadius:10,padding:14,fontSize:12,color:C.muted,lineHeight:1.7,position:"relative"}}>
                {managerPolicy&&managerPolicy.__contactNote?managerPolicy.__contactNote:(isHarvey?"For urgent issues text us directly. We typically respond within 2 hours during business hours.":"[Add a support note for your cleaners here — e.g. response time, best way to reach you]")}
                {editingTab&&isManager&&(
                  <button onClick={function(){setEditField({type:"note",value:managerPolicy&&managerPolicy.__contactNote?managerPolicy.__contactNote:"For urgent issues text us directly. We typically respond within 2 hours during business hours."});}}
                    style={{position:"absolute",top:8,right:8,background:"transparent",border:"none",color:"#CC0000",fontSize:11,fontWeight:700,cursor:"pointer"}}>✏️</button>
                )}
              </div>
            )}
          </div>

          {/* TurnReady Platform Support — always visible at bottom of contact tab */}
          <div style={{marginTop:16,borderTop:"1px solid #2A2A2A",paddingTop:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{fontFamily:"Arial Black,sans-serif",fontSize:10,fontWeight:900,letterSpacing:.5,color:"#555",textTransform:"uppercase"}}>Powered by TurnReady</div>
            </div>
            {[
              {icon:"📱",label:"Instagram",value:"@turnreadyapp",href:"https://instagram.com/turnreadyapp"},
              {icon:"🌐",label:"Website",value:"www.turnready.app",href:"https://turnready.app"},
              {icon:"📧",label:"Platform Support",value:"support@turnready.app",href:"mailto:support@turnready.app"},
            ].map(function(item){return(
              <div key={item.label} onClick={function(){if(item.href)window.open(item.href,"_blank");}}
                style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"8px 10px",background:"#111",borderRadius:8,cursor:"pointer"}}>
                <span style={{fontSize:14}}>{item.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:"#444",fontWeight:700,textTransform:"uppercase",letterSpacing:.3}}>{item.label}</div>
                  <div style={{fontSize:12,color:"#555",textDecoration:"underline",textDecorationStyle:"dotted"}}>{item.value}</div>
                </div>
                <span style={{fontSize:9,color:"#555"}}>↗</span>
              </div>
            );})}
          </div>
        </div>
      )}
    {/* Phone Action Sheet */}
    {phoneAction&&(
      <div onClick={function(){setPhoneAction(null);}}
        style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:400,display:"flex",alignItems:"flex-end"}}>
        <div onClick={function(e){e.stopPropagation();}}
          style={{background:"#1A1A1A",borderRadius:"16px 16px 0 0",width:"100%",padding:"20px 16px 32px",fontFamily:"Inter,sans-serif"}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,color:C.muted,letterSpacing:.5,textAlign:"center",marginBottom:4}}>CONTACT</div>
          <div style={{fontSize:16,fontWeight:700,textAlign:"center",marginBottom:20,color:C.offWhite}}>{phoneAction.value}</div>
          {[
            {icon:"📞",label:"Call",color:"#22C55E",action:function(){window.open("tel:"+phoneAction.value.replace(/[^\d+]/g,""),"_blank");}},
            {icon:"💬",label:"Text Message",color:"#3B82F6",action:function(){window.open("sms:"+phoneAction.value.replace(/[^\d+]/g,""),"_blank");}},
            {icon:"📱",label:"WhatsApp",color:"#25D366",action:function(){window.open("https://wa.me/"+phoneAction.value.replace(/[^\d+]/g,""),"_blank");}},
          ].map(function(opt){return(
            <button key={opt.label} onClick={function(){opt.action();setPhoneAction(null);}}
              style={{width:"100%",background:"#2A2A2A",border:"1px solid #333",borderRadius:12,padding:"14px",marginBottom:8,display:"flex",alignItems:"center",gap:14,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:24,width:36,textAlign:"center"}}>{opt.icon}</span>
              <span style={{fontSize:14,fontWeight:600,color:C.offWhite}}>{opt.label}</span>
            </button>
          );})}
          <button onClick={function(){setPhoneAction(null);}}
            style={{width:"100%",background:"transparent",border:"1px solid #333",borderRadius:12,padding:"13px",color:C.muted,fontSize:13,cursor:"pointer",marginTop:4}}>
            Cancel
          </button>
        </div>
      </div>
    )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
function NotificationsPanel({notifications,setNotifications,onClose,user,setView,setShowNotifs}){
  function timeAgo(iso){
    var diff=(Date.now()-new Date(iso).getTime())/1000;
    if(diff<60)return "just now";
    if(diff<3600)return Math.floor(diff/60)+"m ago";
    if(diff<86400)return Math.floor(diff/3600)+"h ago";
    return Math.floor(diff/86400)+"d ago";
  }
  var unread=notifications.filter(function(n){return !n.read;}).length;
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.6)"}} onClick={onClose}>
      <div style={{position:"absolute",top:52,right:0,width:"min(340px,100vw)",background:"#141414",borderLeft:"1px solid #2A2A2A",height:"calc(100vh - 52px)",display:"flex",flexDirection:"column",fontFamily:"Inter,sans-serif"}} onClick={function(e){e.stopPropagation();}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 16px 12px",borderBottom:"1px solid #2A2A2A",flexShrink:0,position:"sticky",top:0,background:"#141414",zIndex:10}}>
          <div>
            <div style={{fontFamily:"Arial Black,sans-serif",fontSize:15,fontWeight:900,letterSpacing:.5}}>NOTIFICATIONS</div>
            {unread>0&&<div style={{fontSize:11,color:"#CC0000",marginTop:2}}>{unread} unread</div>}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {unread>0&&<button onClick={function(){setNotifications(function(ns){return ns.map(function(n){return Object.assign({},n,{read:true});});});}}
              style={{background:"transparent",border:"1px solid #333",borderRadius:6,color:"#888",fontSize:10,padding:"4px 8px",cursor:"pointer"}}>Mark all read</button>}
            <button onClick={function(){setNotifications([]);}} style={{background:"transparent",border:"1px solid #333",borderRadius:6,color:"#888",fontSize:10,padding:"4px 8px",cursor:"pointer"}}>Clear</button>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#888",fontSize:24,lineHeight:1,cursor:"pointer",padding:"0 2px",marginLeft:2}}>×</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
          {notifications.length===0&&(
            <div style={{textAlign:"center",padding:40,color:"#555"}}>
              <div style={{fontSize:32,marginBottom:10}}>🔔</div>
              <div style={{fontSize:13}}>No notifications yet</div>
            </div>
          )}
          {notifications.map(function(n){
            return(
              <div key={n.id} onClick={function(){
                  setNotifications(function(ns){return ns.map(function(x){return x.id===n.id?Object.assign({},x,{read:true}):x;});});
                  if(n.navTo&&setView){setView(n.navTo);setShowNotifs(false);}
                }}
                style={{padding:"14px 16px",borderBottom:"1px solid #1A1A1A",background:n.read?"transparent":"rgba(204,0,0,.04)",cursor:"pointer"}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:38,height:38,borderRadius:10,background:"#1A1A1A",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{n.icon||"🔔"}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6,marginBottom:3}}>
                      <div style={{fontSize:13,fontWeight:700,color:n.read?"#CCC":"#FFF",lineHeight:1.3}}>{n.title}</div>
                      {!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:"#CC0000",flexShrink:0,marginTop:3}}/>}
                    </div>
                    <div style={{fontSize:12,color:"#888",lineHeight:1.5,marginBottom:4}}>{n.body}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:10,color:"#555"}}>{n.time?timeAgo(n.time):""}</div>
                      {n.navTo&&<div style={{fontSize:10,color:"#CC0000",fontWeight:700}}>Tap to view →</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("Dashboard");
  const [authLoading, setAuthLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(function(){try{return localStorage.getItem("turnready_theme")!=="light";}catch(e){return true;}});

  // Restore session on app load
  useEffect(function(){
    // Clear old large localStorage caches that could freeze the browser
    try{
      var allKeys=Object.keys(localStorage);
      allKeys.forEach(function(k){
        if(k.startsWith("tr_props_")||k.startsWith("turnready_shared_props")||k.startsWith("turnready_mgr_")){
          var val=localStorage.getItem(k);
          if(val&&val.length>500000){localStorage.removeItem(k);}
        }
      });
    }catch(e){}
    // Real users: delete ALL prop caches on startup — Supabase is the only source of truth.
    try{
      var _isR=localStorage.getItem("turnready_is_real_user");
      if(_isR==="true"){
        localStorage.removeItem("turnready_shared_props");
        Object.keys(localStorage).forEach(function(k){
          if(k.startsWith("tr_props_")||k.startsWith("turnready_mgr_"))localStorage.removeItem(k);
        });
      }
    }catch(e){}
    getCurrentUser().then(function(profile){
      if(profile){
        // Mark as real user so demo data doesn't load
        try{localStorage.setItem("turnready_is_real_user","true");}catch(e){}
        // Load notifications from Supabase
        if(profile.id&&profile.id.length>10){
          getNotifications(profile.id).then(function(dbNotifs){
            if(dbNotifs&&dbNotifs.length>0){
              var mapped=dbNotifs.map(function(n){return Object.assign({},n,{
                forRole:n.for_role,navTo:n.nav_to,
              });});
              setNotifications(mapped);
            }
          }).catch(function(e){console.error("Notifications load:",e.message);});
        }
        // Map DB field names to app field names
        var mappedProfile=Object.assign({},profile,{
          stripeStatus:profile.stripe_status||"pending",
          stripeAccount:profile.stripe_account_id||null,
          stripeBusinessStatus:profile.stripe_business_status||"not_connected",
          stripeBusinessAccount:profile.stripe_business_account||null,
          businessName:profile.business_name||null,
          totalEarned:profile.total_earned||0,
          jobsCompleted:profile.jobs_completed||0,
          joinedAt:profile.joined_at||profile.created_at,
          photo:profile.photo||null,
          avatar:profile.avatar||null,
          businessPhone:profile.business_phone||null,
          businessAddress:profile.business_address||null,
          emergency:profile.emergency||null,
        });
        setUser(mappedProfile);
        try{localStorage.setItem("turnready_session_user",JSON.stringify({id:profile.id,role:profile.role}));}catch(e){}
        if(profile.role==="cleaner")setView("Home");
        if(profile.role==="manager"){
          setView("Dashboard");
          // Load jobs from Supabase on session restore
          getJobs({}).then(function(dbJobs){
            if(dbJobs&&dbJobs.length>0){
              var mappedJobs=dbJobs.map(function(j){
                return Object.assign({},j,{
                  dbId:j.id,
                  id:j.id,
                  propertyId:j.property_id,
                  propertyName:j.property_name,
                  cleanerId:j.cleaner_id,
                  completedAt:j.completed_at,
                  paidAt:j.paid_at,
                  startedAt:j.started_at,
                  rejectReason:j.rejection_reason,
                  durationStr:j.duration_seconds?Math.floor(j.duration_seconds/3600)+"h "+Math.floor((j.duration_seconds%3600)/60)+"m":"",
                  tasks:j.tasks||[],
                  inventory:j.inventory||[],
                  uploads:j.uploads||[],
                });
              });
              setJobs(mappedJobs);
            }
          }).catch(function(e){console.error("Jobs load failed:",e.message);});
          // Load properties from Supabase ONLY — never pre-load from localStorage cache.
          // tasks/rooms/inventory always [] here; load lazily via getPropertyFull when property is opened.
          // _fullLoaded always false so getPropertyFull runs every time.
          getProperties(profile.id).then(function(dbProps){
            var _mp=(dbProps||[]).map(function(p){
              return Object.assign({},p,{
                schedule:p.schedule||[],tasks:[],rooms:[],inventory:[],_fullLoaded:false,
                checkIn:p.checkIn||p.check_in||"4:00 PM",checkOut:p.checkOut||p.check_out||"11:00 AM",
                sameDay:p.sameDay||p.same_day||false,accessCode:p.accessCode||p.access_code||"",
                supplyInfo:p.supplyInfo||p.supply_info||"",alarmCode:p.alarmCode||p.alarm_code||"",
                linenRate:p.linenRate||p.linen_rate||10,linenBags:p.linenBags||p.linen_bags||0,
                totalBeds:p.totalBeds||p.total_beds||1,assignedTo:p.assignedTo||p.assigned_to||null,
              });
            });
            setProps(_mp);
            console.log("[TurnReady] Session restore: loaded",_mp.length,"properties from Supabase");
          }).catch(function(e){console.error("[TurnReady] Session restore failed:",e&&e.message);});
          // Real users: load real cleaners only — never inject demo Maria/James/Priya
          getTeamCleaners(profile.id).then(function(dbCleaners){
            var _de=INIT_CLEANERS.map(function(c){return c.email;});
            var _rc=(dbCleaners||[]).filter(function(c){return _de.indexOf(c.email)<0;});
            setCleaners(_rc.map(function(c){return Object.assign({},c,{
              avatar:c.avatar||(c.name||"?").split(" ").map(function(w){return w[0]||"";}).join("").slice(0,2).toUpperCase(),
              totalEarned:c.total_earned||0,jobsCompleted:c.jobs_completed||0,
              stripeStatus:c.stripe_status||"pending",joinedAt:c.joined_at||new Date().toISOString(),
            });}));
          }).catch(function(){setCleaners([]);});
        }
      }
      setAuthLoading(false);
    }).catch(function(){
      setAuthLoading(false);
    });
  },[]);
  C = darkMode?DARK_THEME:LIGHT_THEME;
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState("welcome"); // "welcome" | "stripe"
  const [showMgrStripe, setShowMgrStripe] = useState(false);
  const [availability, setAvailability] = useState({});
  const [managerPolicy, setManagerPolicy] = useState(function(){
    // Harvey uses the real POLICIES, others get template or their saved version
    try{
      var saved=localStorage.getItem("turnready_policy");
      if(saved)return JSON.parse(saved);
    }catch(e){}
    return null; // null means use default (POLICIES for Harvey, TEMPLATE for others)
  });

  // Apply theme to document
  useEffect(function(){
    var r=document.documentElement;
    if(darkMode){
      document.body.style.background="#0D0D0D";
      document.body.style.color="#FFF";
      r.style.setProperty("--card-bg","#1A1A1A");
      r.style.setProperty("--card-border","#2A2A2A");
      r.style.setProperty("--input-bg","#141414");
      r.style.setProperty("--input-border","#2A2A2A");
      r.style.setProperty("--input-color","#FFF");
      r.style.setProperty("--label-color","#888");
    } else {
      document.body.style.background="#F0F0F0";
      document.body.style.color="#111";
      r.style.setProperty("--card-bg","#FFF");
      r.style.setProperty("--card-border","#DDD");
      r.style.setProperty("--input-bg","#FAFAFA");
      r.style.setProperty("--input-border","#CCC");
      r.style.setProperty("--input-color","#111");
      r.style.setProperty("--label-color","#555");
    }
  }, [darkMode]);
  const INVITE_CODE = "HARVEY2024";
  const [props, setProps] = useState(function(){
    try{
      var flag=localStorage.getItem("turnready_is_real_user");
      if(flag==="true"){
        // Real user - always start empty, load fresh from Supabase
        // (cache disabled - old cache had huge base64 videos that froze the browser)
        return [];
      }
      var stored=localStorage.getItem("turnready_shared_props");
      if(stored){var sp=JSON.parse(stored);if(sp&&sp.length)return sp;}
    }catch(e){}
    return INIT_PROPS;
  });
  const [cleaners, setCleaners] = useState(function(){
    try{
      var flag=localStorage.getItem("turnready_is_real_user");
      if(flag==="true")return []; // Real user - load from Supabase
      var stored=localStorage.getItem("turnready_cleaners");
      if(stored){
        var parsed=JSON.parse(stored);
        var initIds=INIT_CLEANERS.map(function(c){return c.id;});
        var extra=parsed.filter(function(c){return initIds.indexOf(c.id)<0;});
        return INIT_CLEANERS.concat(extra);
      }
    }catch(e){}
    return INIT_CLEANERS;
  });
  const [jobs, setJobs] = useState(function(){
    try{
      var flag=localStorage.getItem("turnready_is_real_user");
      if(flag==="true")return []; // Real user - start empty
      var stored=localStorage.getItem("turnready_shared_jobs");
      if(stored){var sj=JSON.parse(stored);if(sj&&sj.length)return sj;}
    }catch(e){}
    return INIT_JOBS;
  });
  const [pendingRemovals, setPendingRemovals] = useState([]);
  const [pendingCleaners, setPendingCleaners] = useState([]);
  const [notifications, setNotifications] = useState(function(){
    try{
      var flag=localStorage.getItem("turnready_is_real_user");
      if(flag==="true")return [];
      var s=localStorage.getItem("turnready_notifications");
      return s?JSON.parse(s):[];
    }catch(e){return [];}
  });
  const [notifRead, setNotifRead] = useState({});

  // Persist notifications to localStorage
  useEffect(function(){
    try{localStorage.setItem("turnready_notifications",JSON.stringify(notifications.slice(0,50)));}catch(e){}
  },[notifications]);

  // Auto-sync props to Supabase when they change (debounced)
  const propsSyncTimer = useRef(null);
  useEffect(function(){
    if(!user||!user.id||user.id==="mgr1")return;
    var isReal=false;
    try{isReal=localStorage.getItem("turnready_is_real_user")==="true";}catch(e){}
    if(!isReal)return;
    // Debounce - wait 2 seconds after last change before saving
    if(propsSyncTimer.current)clearTimeout(propsSyncTimer.current);
    propsSyncTimer.current=setTimeout(function(){
      props.forEach(function(p){
        if(!p.id||!p.id.includes("-"))return;
        var roomsForSync=(p.rooms||[]).map(function(r){
          return Object.assign({},r,{
            video: r.video?(r.video.startsWith("http")?r.video:(r.video.length<10000000?r.video:null)):null,
            preVideo: r.preVideo?(r.preVideo.startsWith("http")?r.preVideo:(r.preVideo.length<10000000?r.preVideo:null)):null,
            refVideo: r.refVideo?(r.refVideo.startsWith("http")?r.refVideo:(r.refVideo.length<10000000?r.refVideo:null)):null,
            videoUploading: false,
            refVideoUploading: false,
          });
        });
        // Build sync payload — never include photo unless it's a Storage URL.
        // Syncing undefined/base64 as photo was overwriting DB value with null.
        var _sp={
          name:p.name,address:p.address,type:p.type,pay:p.pay,bedrooms:p.bedrooms,bathrooms:p.bathrooms,
          notes:p.notes,checkIn:p.checkIn||p.check_in,checkOut:p.checkOut||p.check_out,
          sameDay:p.sameDay||p.same_day,accessCode:p.accessCode||p.access_code,
          supplyInfo:p.supplyInfo||p.supply_info,alarmCode:p.alarmCode||p.alarm_code,
          linenRate:p.linenRate||p.linen_rate,totalBeds:p.totalBeds||p.total_beds,
          schedule:p.schedule,linenBags:p.linenBags,assignedTo:p.assignedTo,guest_rating:p.guestRating,
          cleanerPhotos:(p.cleanerPhotos||[]).filter(function(ph){return ph&&ph.startsWith("http");}),
          linenBagPhotos:(p.linenBagPhotos||[]).filter(function(ph){return ph&&ph.startsWith("http");}),
          cleanerNotes:p.cleanerNotes,
        };
        // Only include photo if it is a real Storage URL
        if(p.photo&&p.photo.startsWith("http"))_sp.photo=p.photo;
        // CRITICAL: Only write tasks/rooms/inventory when _fullLoaded is true.
        // When false, p.tasks/rooms/inventory are [] (lazy-load placeholders from getProperties).
        // Writing [] would permanently erase the real data saved in Supabase.
        if(p._fullLoaded){
          _sp.tasks=p.tasks;
          _sp.rooms=roomsForSync;
          _sp.inventory=p.inventory;
        }
        updateProperty(p.id,_sp).catch(function(e){
          console.error("❌ Supabase sync failed for property",p.id,"Error:",e.message,"Code:",e.code);
        });
      });
    },800);
  },[props]);

  // Persist manager data — demo accounts only. Real users: Supabase is source of truth.
  useEffect(function(){
    if(!user||user.role!=="manager")return;
    var _pr=false;try{_pr=localStorage.getItem("turnready_is_real_user")==="true";}catch(e){}
    if(_pr){try{localStorage.setItem("turnready_notifs_"+user.id,JSON.stringify(notifications.slice(0,50)));}catch(e){}return;}
    try{localStorage.setItem("turnready_mgr_"+user.id,JSON.stringify({props:props,cleaners:cleaners,jobs:jobs,notifications:notifications.slice(0,50)}));}catch(e){}
  },[props,cleaners,jobs,notifications,user]);

  // Persist jobs/removals. Real users: NEVER cache props — Supabase is source of truth.
  useEffect(function(){
    if(!user)return;
    var _rr=false;try{_rr=localStorage.getItem("turnready_is_real_user")==="true";}catch(e){}
    try{
      if(!_rr)localStorage.setItem("turnready_shared_props",JSON.stringify(props));
      localStorage.setItem("turnready_shared_jobs",JSON.stringify(jobs));
      localStorage.setItem("turnready_shared_removals",JSON.stringify(pendingRemovals));
    }catch(e){}
  },[props,jobs,pendingRemovals,user]);

  // Persist policy edits
  useEffect(function(){
    if(!managerPolicy)return;
    try{localStorage.setItem("turnready_policy",JSON.stringify(managerPolicy));}catch(e){}
  },[managerPolicy]);

  // #30 - Check for expired 8-hour acceptance windows every minute
  useEffect(function(){
    function checkExpired(){
      var now=Date.now();
      props.forEach(function(p){
        (p.schedule||[]).forEach(function(slot){
          if(slot.status==="pending_acceptance"&&slot.assignedAt){
            var hoursLeft=(8*3600000-(now-new Date(slot.assignedAt).getTime()))/3600000;
            // Fire notification at 2hr warning and at expiry
            if(hoursLeft<=0){
              var alreadyFired=notifications.some(function(n){return(n.type==="expired"||n.type==="auto_assigned")&&n.slotId===slot.id;});
              if(!alreadyFired){
                var primaryCl=cleaners.find(function(c){return c.id===slot.cleanerId;})||{name:"Cleaner"};
                // Find an available backup cleaner
                var backupCl=null;
                var otherCleaners=cleaners.filter(function(c){return c.id!==slot.cleanerId;});
                for(var bi=0;bi<otherCleaners.length;bi++){
                  var candidate=otherCleaners[bi];
                  // Check candidate is not already booked on this date
                  var busyOnDate=false;
                  // Check time conflict (within 3 hours of slot time)
                  var slotHour=slot.time?parseInt(slot.time.split(":")[0])||11:11;
                  props.forEach(function(pp){
                    (pp.schedule||[]).forEach(function(ss){
                      if((ss.cleanerId===candidate.id||ss.cleanerId2===candidate.id)&&ss.date===slot.date&&ss.status!=="declined"&&ss.id!==slot.id){
                        // Check if times overlap (within 3 hours of each other)
                        var existHour=ss.time?parseInt(ss.time.split(":")[0])||11:11;
                        if(Math.abs(slotHour-existHour)<3){
                          busyOnDate=true;
                        }
                      }
                    });
                  });
                  // Check candidate has not blocked this date
                  var avail=(availability&&availability[candidate.id])||{};
                  var dow=new Date(slot.date+"T12:00:00").getDay();
                  var dateBlocked=(avail.blockedDays||[]).includes(dow)||(avail.blockedDates||[]).includes(slot.date);
                  if(!busyOnDate&&!dateBlocked){
                    backupCl=candidate;
                    break;
                  }
                }
                if(backupCl){
                  // Auto-reassign to backup
                  setProps(function(ps){return ps.map(function(pp){
                    if(pp.id!==p.id)return pp;
                    return Object.assign({},pp,{schedule:(pp.schedule||[]).map(function(ss){
                      if(ss.id!==slot.id)return ss;
                      return Object.assign({},ss,{
                        cleanerId:backupCl.id,
                        status:"pending_acceptance",
                        assignedAt:new Date().toISOString(),
                        autoAssigned:true,
                        originalCleanerId:slot.cleanerId,
                      });
                    })});
                  });});
                  // Notify the backup cleaner
                  setNotifications(function(prev){return prev.concat([
                    {type:"assigned",icon:"📋",title:"New Job Assigned!",
                      body:"You have been automatically assigned to clean "+p.name+" on "+slot.date+" at "+(slot.time||"11:00")+". "+primaryCl.name+" did not respond in time. Please accept or decline within 8 hours.",
                      forRole:"cleaner",forCleaner:backupCl.id,navTo:"My Jobs",slotId:slot.id,time:new Date().toISOString(),read:false},
                    // Notify manager it was auto-assigned
                    {type:"auto_assigned",icon:"🔄",title:"Job Auto-Assigned to Backup",
                      body:primaryCl.name+" did not respond. "+backupCl.name+" has been automatically assigned to "+p.name+" on "+slot.date+".",
                      forRole:"manager",navTo:"Approvals",slotId:slot.id,time:new Date().toISOString(),read:false}
                  ]);});
                } else {
                  // No backup available - notify manager to handle manually
                  setNotifications(function(prev){return prev.concat([{
                    type:"expired",icon:"⏰",title:"Job Offer Expired — Action Needed",
                    body:primaryCl.name+" did not respond to the job at "+p.name+" on "+slot.date+". No backup is available — please reassign manually.",
                    forRole:"manager",navTo:"Approvals",slotId:slot.id,time:new Date().toISOString(),read:false
                  }]);});
                }
              }
            } else if(hoursLeft<=2&&hoursLeft>1.9){
              var warnFired=notifications.some(function(n){return n.type==="expiry_warning"&&n.slotId===slot.id;});
              if(!warnFired){
                var cl2=cleaners.find(function(c){return c.id===slot.cleanerId;})||{name:"Cleaner"};
                setNotifications(function(prev){return prev.concat([{type:"expiry_warning",icon:"⚠️",title:"Job Offer Expiring Soon",body:cl2.name+" has less than 2 hours to accept the job at "+p.name+". A backup will be auto-assigned if they don't respond.",forRole:"manager",navTo:"Approvals",slotId:slot.id,time:new Date().toISOString(),read:false}]);});
              }
            }
          }
        });
      });
    }
    checkExpired();
    var interval=setInterval(checkExpired,60000);
    return function(){clearInterval(interval);};
  },[props,cleaners,notifications,availability]);

  // Persist cleaners — demo accounts only. Real users always reload from Supabase.
  useEffect(function(){
    var _rc=false;try{_rc=localStorage.getItem("turnready_is_real_user")==="true";}catch(e){}
    if(_rc)return;
    try{var initIds=INIT_CLEANERS.map(function(c){return c.id;});var extra=cleaners.filter(function(c){return initIds.indexOf(c.id)<0;});if(extra.length>0)localStorage.setItem("turnready_cleaners",JSON.stringify(cleaners));}catch(e){}
  },[cleaners]);

  // Request push permission on load
  useEffect(function(){
    if("Notification" in window&&Notification.permission==="default"){
      Notification.requestPermission();
    }
  },[]);

  function sendPush(title,body,icon){
    try{
      if("Notification" in window&&Notification.permission==="granted"){
        new Notification(title,{body:body,icon:icon||"/favicon.ico",badge:"/favicon.ico"});
      }
    }catch(e){}
  }

  function addNotif(notif){
    var n=Object.assign({id:Date.now()+"_"+Math.random(),time:new Date().toISOString(),read:false},notif);
    setNotifications(function(prev){
      // avoid dupes within 5 seconds
      var recent=prev.filter(function(p){return p.type===n.type&&p.propId===n.propId&&(Date.now()-new Date(p.time).getTime())<5000;});
      if(recent.length>0)return prev;
      // Send push notification
      sendPush(n.title,n.body);
      return [n].concat(prev).slice(0,50);
    });
  }

  // Generate notifications from state
  var prevJobsRef=React.useRef([]);
  var prevPropsRef=React.useRef([]);
  useEffect(function(){
    var prevJobs=prevJobsRef.current;
    // New job submission (cleaner submitted)
    jobs.forEach(function(j){
      var prev=prevJobs.find(function(p){return p.id===j.id;});
      if(!prev)return;
      if(prev.status!=="pending_approval"&&j.status==="pending_approval"){
        var cl=cleaners.find(function(c){return c.id===j.cleanerId;})||{name:"Cleaner"};
        addNotif({type:"submission",icon:"📋",title:"Job Submitted for Approval",body:cl.name+" completed "+j.propertyName+". Ready to review.",propId:j.id,forRole:"manager",navTo:"Approvals"});
      }
      if(prev.status!=="approved"&&j.status==="approved"){
        addNotif({type:"payment",icon:"💳",title:"Payment Sent!",body:"You were paid "+fmt(j.pay)+" for "+j.propertyName+". Great work!",propId:j.id,forCleaner:j.cleanerId,forRole:"cleaner",navTo:"My Earnings"});
        addNotif({type:"approved",icon:"✅",title:"Job Approved",body:j.propertyName+" approved and payment released to cleaner.",propId:j.id,forRole:"manager",navTo:"Payroll"});
      }
      if(prev.status!=="rejected"&&j.status==="rejected"){
        addNotif({type:"rejected",icon:"❌",title:"Job Rejected",body:j.propertyName+" was rejected. Check manager notes.",propId:j.id,forCleaner:j.cleanerId,forRole:"cleaner",navTo:"My Jobs"});
      }
    });
    // New job assigned
    jobs.forEach(function(j){
      var prev=prevJobs.find(function(p){return p.id===j.id;});
      if(!prev&&j.cleanerId){
        addNotif({type:"assigned",icon:"🏠",title:"New Job Assigned!",body:"You have been assigned to "+j.propertyName+". Check My Jobs for details.",propId:j.id,forCleaner:j.cleanerId,forRole:"cleaner",navTo:"My Jobs"});
        var cl=cleaners.find(function(c){return c.id===j.cleanerId;})||{name:"Cleaner"};
        addNotif({type:"assigned",icon:"📅",title:"Job Assigned",body:cl.name+" assigned to "+j.propertyName+".",propId:j.id,forRole:"manager",navTo:"Properties"});
      }
    });
    prevJobsRef.current=jobs;
  },[jobs]);

  // Upcoming job reminders - check every minute
  useEffect(function(){
    function checkUpcoming(){
      var now=new Date();
      props.forEach(function(p){
        (p.schedule||[]).forEach(function(slot){
          if(!slot.cleanerId||slot.status==="complete")return;
          var jobDate=new Date(slot.date+"T"+(slot.time||"11:00"));
          var hoursAway=(jobDate-now)/(1000*60*60);
          if(hoursAway>0&&hoursAway<=24&&hoursAway>23){
            addNotif({type:"upcoming",icon:"⏰",title:"Job Tomorrow!",body:p.name+" is scheduled for "+slot.date+" at "+(slot.time||"11:00")+". Get ready!",propId:p.id,forCleaner:slot.cleanerId,forRole:"both",navTo:"My Jobs"});
          }
          if(hoursAway>0&&hoursAway<=2&&hoursAway>1.9){
            addNotif({type:"upcoming",icon:"🚨",title:"Job in 2 Hours!",body:p.name+" starts in about 2 hours at "+(slot.time||"11:00")+". Time to prepare!",propId:p.id,forCleaner:slot.cleanerId,forRole:"both",navTo:"My Jobs"});
          }
        });
      });
    }
    checkUpcoming();
    var interval=setInterval(checkUpcoming,60000);
    return function(){clearInterval(interval);};
  },[props,cleaners]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [selectedCleaner, setSelectedCleaner] = useState(null);
  const [selectedProp, setSelectedProp] = useState(null);
  const [showAI, setShowAI] = useState(false);
  var pending = jobs.filter(j=>j.status==="pending_approval").length;

  useEffect(()=>{
    if((user&&user.role)==="manager") setView("Dashboard");
    else if((user&&user.role)==="cleaner") setView("Home");
  },[user]);

  if(authLoading) return (<div style={{minHeight:"100vh",background:"#0D0D0D",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}><style>{css}</style><div style={{fontFamily:"Arial Black,sans-serif",fontSize:22,fontWeight:900,letterSpacing:1}}><span style={{color:"#FFF"}}>TURN</span><span style={{color:"#CC0000"}}>READY</span></div><div style={{color:"#888",fontSize:13}}>Loading...</div></div>);
  if(!user) return (<div><style>{css}</style><Login onLogin={function(u,isNew,newCleaner){
            setUser(u);
            if(u.role==="cleaner")setView("Home");
            if(u.role==="manager")setView("Dashboard");
            // Real managers: always load from Supabase — never from localStorage cache.
            if(u.role==="manager"&&u.id!=="mgr1"){
              setProps([]);setCleaners([]);setJobs([]);setNotifications([]);
              getProperties(u.id).then(function(dbProps){
                var _lm=(dbProps||[]).map(function(p){return Object.assign({},p,{
                  schedule:p.schedule||[],tasks:[],rooms:[],inventory:[],_fullLoaded:false,
                  checkIn:p.checkIn||p.check_in||"4:00 PM",checkOut:p.checkOut||p.check_out||"11:00 AM",
                  sameDay:p.sameDay||p.same_day||false,accessCode:p.accessCode||p.access_code||"",
                  supplyInfo:p.supplyInfo||p.supply_info||"",alarmCode:p.alarmCode||p.alarm_code||"",
                  linenRate:p.linenRate||p.linen_rate||10,linenBags:p.linenBags||p.linen_bags||0,
                  totalBeds:p.totalBeds||p.total_beds||1,assignedTo:p.assignedTo||p.assigned_to||null,
                });});
                setProps(_lm);
                if(_lm.length===0)setManagerPolicy(TEMPLATE_POLICIES);
                console.log("[TurnReady] Login: loaded",_lm.length,"properties from Supabase");
              }).catch(function(e){console.error("[TurnReady] Login getProperties failed:",e&&e.message);});
              getTeamCleaners(u.id).then(function(dbCleaners){
                var _de=INIT_CLEANERS.map(function(c){return c.email;});
                var _rc=(dbCleaners||[]).filter(function(c){return _de.indexOf(c.email)<0;});
                setCleaners(_rc.map(function(c){return Object.assign({},c,{
                  avatar:c.avatar||(c.name||"?").split(" ").map(function(w){return w[0]||"";}).join("").slice(0,2).toUpperCase(),
                  totalEarned:c.total_earned||0,jobsCompleted:c.jobs_completed||0,
                  stripeStatus:c.stripe_status||"pending",joinedAt:c.joined_at||new Date().toISOString(),
                });}));
              }).catch(function(){setCleaners([]);});
              getJobs({}).then(function(dbJobs){
                if(dbJobs&&dbJobs.length>0)setJobs(dbJobs.map(function(j){return Object.assign({},j,{
                  dbId:j.id,id:j.id,propertyId:j.property_id,propertyName:j.property_name,
                  cleanerId:j.cleaner_id,completedAt:j.completed_at,paidAt:j.paid_at,startedAt:j.started_at,
                  rejectReason:j.rejection_reason,
                  durationStr:j.duration_seconds?Math.floor(j.duration_seconds/3600)+"h "+Math.floor((j.duration_seconds%3600)/60)+"m":"",
                  tasks:j.tasks||[],inventory:j.inventory||[],uploads:j.uploads||[],
                });}));
              }).catch(function(e){console.error("[TurnReady] Login getJobs failed:",e&&e.message);});
              try{var _rem=localStorage.getItem("turnready_shared_removals");if(_rem){var _rp=JSON.parse(_rem);if(_rp&&_rp.length)setPendingRemovals(_rp);}}catch(e){}
            } else if(u.role==="manager"){
              setProps(INIT_PROPS);setCleaners(INIT_CLEANERS);setJobs(INIT_JOBS);
            }
            // New manager - trigger Stripe setup if not connected
            if(u.role==="manager"&&isNew&&(!u.stripeBusinessStatus||u.stripeBusinessStatus==="not_connected")){
              setShowMgrStripe(true);
            }
            if(isNew&&u.role==="cleaner"){
              setShowOnboarding(true);
              // Notify manager
              setNotifications(function(prev){
                var n={id:"notif"+Date.now(),type:"new_cleaner",icon:"🧹",title:"New Cleaner Joined!",body:(newCleaner?newCleaner.name:u.name)+" just signed up with your invite code and is ready to be assigned.",time:new Date().toISOString(),read:false,forRole:"manager",navTo:"Team"};
                return [n].concat(prev).slice(0,50);
              });
            }
          }} cleaners={cleaners} setCleaners={setCleaners} pending={pendingCleaners} setPending={setPendingCleaners} inviteCode={INVITE_CODE}/></div>);
  
  if(showOnboarding&&user&&user.role==="cleaner") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.offWhite,fontFamily:"Inter,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{css}</style>
      <div style={{flex:1,overflowY:"auto",padding:"40px 24px 24px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:44,marginBottom:10}}>🧹</div>
          <div style={{fontSize:11,color:"#888",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Step 1 of 2</div>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:22,fontWeight:900,letterSpacing:1,marginBottom:6}}>WELCOME, <span style={{color:"#CC0000"}}>{user.name.split(" ")[0].toUpperCase()}!</span></div>
          <div style={{fontSize:13,color:"#888",lineHeight:1.6}}>You are now part of the team. Here is how to get started.</div>
        </div>
        {[
          ["1","🏠","Check My Jobs","Tap My Jobs in the bottom nav to see properties assigned to you."],
          ["2","📸","Document First","In the Rooms tab upload a video of each room BEFORE cleaning. This protects you."],
          ["3","▶️","Start the Job","Tap TAP TO BEGIN CLEANING to unlock tasks, inventory, and uploads."],
          ["4","✅","Complete Every Tab","Work through Tasks, Inventory, Rooms, Guest Rating, and Notes completely."],
          ["5","💳","Submit for Payment","When the Submit button turns red tap it. Payment releases within 48 hours after approval."],
        ].map(function(item){return(
          <div key={item[0]} style={{display:"flex",gap:14,marginBottom:18,alignItems:"flex-start"}}>
            <div style={{width:34,height:34,borderRadius:9,background:"#CC0000",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Arial Black,sans-serif",fontWeight:900,fontSize:15,flexShrink:0}}>{item[0]}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                <span style={{fontSize:16}}>{item[1]}</span>
                <div style={{fontFamily:"Arial Black,sans-serif",fontSize:13,fontWeight:900,letterSpacing:.3}}>{item[2]}</div>
              </div>
              <div style={{fontSize:12,color:"#888",lineHeight:1.6}}>{item[3]}</div>
            </div>
          </div>
        );})}
      </div>
      <div style={{padding:"16px 24px 32px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <button onClick={function(){setOnboardingStep("stripe");}}
            style={{width:"100%",background:"#CC0000",border:"none",borderRadius:10,padding:"16px",color:"#FFF",fontSize:14,fontWeight:900,fontFamily:"Arial Black,sans-serif",letterSpacing:.5,cursor:"pointer"}}>
            NEXT: SET UP PAYMENTS →
          </button>
          <button onClick={function(){setShowOnboarding(false);setOnboardingStep("welcome");setView("Home");}}
            style={{width:"100%",background:"transparent",border:"1px solid #333",borderRadius:10,padding:"12px",color:"#666",fontSize:12,cursor:"pointer"}}>
            Skip — Go to the App
          </button>
        </div>
      </div>
    </div>
  );

  // Stripe setup screen (step 2 of onboarding)
  if(showOnboarding&&onboardingStep==="stripe"&&user&&user.role==="cleaner") return(
    <div style={{minHeight:"100vh",background:"#0D0D0D",color:"#FFF",fontFamily:"Inter,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{css}</style>
      <div style={{flex:1,overflowY:"auto",padding:"40px 24px 24px"}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:72,height:72,borderRadius:16,background:"#635BFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 16px"}}>💳</div>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:22,fontWeight:900,letterSpacing:1,marginBottom:8}}>
            SET UP <span style={{color:"#635BFF"}}>PAYMENTS</span>
          </div>
          <div style={{fontSize:13,color:"#888",lineHeight:1.6,maxWidth:320,margin:"0 auto"}}>
            Connect your bank account through Stripe so Harvey can pay you directly after each approved job.
          </div>
        </div>

        {/* Why it's required */}
        <div style={{background:"rgba(99,91,255,.08)",border:"1px solid rgba(99,91,255,.3)",borderRadius:12,padding:16,marginBottom:20}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,color:"#635BFF",letterSpacing:.5,marginBottom:10}}>WHY THIS IS REQUIRED</div>
          {[
            ["🔒","Secure & Protected","Your bank info is stored by Stripe — not Harvey, not TurnReady. Nobody can see your account details."],
            ["⚡","Fast Payments","Once connected, payments hit your bank within 1-2 business days after approval."],
            ["📱","Works on Any Bank","Checking, savings, credit union — Stripe connects to virtually any US bank account."],
            ["💰","No Fees","You receive 100% of your pay. No deductions, no processing fees on your end."],
          ].map(function(item){return(
            <div key={item[0]} style={{display:"flex",gap:12,marginBottom:12,alignItems:"flex-start"}}>
              <span style={{fontSize:20,flexShrink:0}}>{item[0]}</span>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#FFF",marginBottom:2}}>{item[1]}</div>
                <div style={{fontSize:11,color:"#888",lineHeight:1.5}}>{item[2]}</div>
              </div>
            </div>
          );})}
        </div>

        {/* What you'll need */}
        <div className="card" style={{marginBottom:20}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:10}}>WHAT YOU'LL NEED</div>
          {["Your full legal name","Social Security Number (last 4 digits)","Bank account & routing number","Date of birth"].map(function(item){return(
            <div key={item} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #2A2A2A"}}>
              <span style={{color:"#22C55E",fontSize:14}}>✓</span>
              <span style={{fontSize:12,color:"#AAA"}}>{item}</span>
            </div>
          );})}
        </div>

        {/* Demo note */}
        <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",borderRadius:10,padding:12,marginBottom:20,fontSize:11,color:"#888",lineHeight:1.6}}>
          <span style={{color:"#F59E0B",fontWeight:700}}>📋 Demo Mode: </span>
          In production this button opens Stripe's secure onboarding flow. For now tap to simulate connection.
        </div>
      </div>

      {/* Bottom buttons */}
      <div style={{padding:"16px 24px 32px",borderTop:"1px solid #2A2A2A"}}>
        {/* Connect Stripe button */}
        <button onClick={function(){
          var acct="acct_"+Date.now();
          var updatedUser=Object.assign({},user,{stripeStatus:"connected",stripeAccount:acct,stripe_status:"connected",stripe_account_id:acct});
          setCleaners(function(cs){return cs.map(function(c){
            return c.id!==user.id?c:Object.assign({},c,{stripeStatus:"connected",stripeAccount:acct});
          });});
          setUser(updatedUser);
          try{
            var stored=localStorage.getItem("turnready_cleaners");
            var existing=stored?JSON.parse(stored):[];
            var fi=existing.findIndex(function(c){return c.id===user.id;});
            if(fi>=0)existing[fi]=Object.assign({},existing[fi],{stripeStatus:"connected",stripeAccount:acct});
            else existing.push(updatedUser);
            localStorage.setItem("turnready_cleaners",JSON.stringify(existing));
          }catch(e){}
          // Save to Supabase
          if(user&&user.id){
            updateUserProfile(user.id,{stripe_status:"connected",stripe_account_id:acct}).catch(function(e){console.error("Cleaner Stripe save:",e.message);});
          }
          setShowOnboarding(false);
          setOnboardingStep("welcome");
        }} style={{width:"100%",background:"#635BFF",border:"none",borderRadius:10,padding:"16px",color:"#FFF",fontSize:14,fontWeight:900,fontFamily:"Arial Black,sans-serif",letterSpacing:.5,cursor:"pointer",marginBottom:10}}>
          💳 CONNECT STRIPE & GET PAID
        </button>

        {/* Skip for now - greyed out with warning */}
        <button onClick={function(){
          // Allow skip but mark as not connected
          setShowOnboarding(false);
          setOnboardingStep("welcome");
          setView("Home");
        }} style={{width:"100%",background:"transparent",border:"1px solid #333",borderRadius:10,padding:"12px",color:"#555",fontSize:12,cursor:"pointer"}}>
          Skip for now — I'll set this up later
        </button>
        <div style={{fontSize:10,color:"#444",textAlign:"center",marginTop:8,lineHeight:1.5}}>
          ⚠️ You won't receive payment until Stripe is connected. Set it up in My Earnings anytime.
        </div>
      </div>
    </div>
  );

  // Manager Stripe setup - required for new managers
  if(user.role==="manager"&&(!user.stripeBusinessStatus||user.stripeBusinessStatus==="not_connected")&&showMgrStripe) return(
    <div style={{minHeight:"100vh",background:"#0D0D0D",color:"#FFF",fontFamily:"Inter,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{css}</style>
      <div style={{flex:1,overflowY:"auto",padding:"40px 24px 24px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:72,height:72,borderRadius:16,background:"#635BFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 16px"}}>💳</div>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:22,fontWeight:900,letterSpacing:1,marginBottom:8}}>
            CONNECT YOUR <span style={{color:"#635BFF"}}>STRIPE</span> ACCOUNT
          </div>
          <div style={{fontSize:13,color:"#888",lineHeight:1.6,maxWidth:320,margin:"0 auto"}}>
            Required before you can approve jobs and pay cleaners. Setup takes about 5 minutes.
          </div>
        </div>

        {/* How it works */}
        <div style={{background:"rgba(99,91,255,.08)",border:"1px solid rgba(99,91,255,.3)",borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,color:"#635BFF",letterSpacing:.5,marginBottom:10}}>HOW IT WORKS</div>
          {[
            ["🏦","Link Your Business Bank","Connect the account you want to pay cleaners FROM. Money is pulled from here on each approval."],
            ["⚡","Instant Approvals","Once connected, tap Approve & Pay and Stripe handles the rest — automatically."],
            ["📊","Full Dashboard","Track every payout, see history, and manage disputes at dashboard.stripe.com."],
            ["🔒","Bank-Level Security","Stripe is used by millions of businesses. Your banking credentials are never stored by TurnReady."],
          ].map(function(item){return(
            <div key={item[0]} style={{display:"flex",gap:12,marginBottom:12,alignItems:"flex-start"}}>
              <span style={{fontSize:20,flexShrink:0}}>{item[0]}</span>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#FFF",marginBottom:2}}>{item[1]}</div>
                <div style={{fontSize:11,color:"#888",lineHeight:1.5}}>{item[2]}</div>
              </div>
            </div>
          );})}
        </div>

        {/* What you need */}
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:12,fontWeight:900,letterSpacing:.5,marginBottom:10}}>WHAT YOU NEED TO SET UP</div>
          {[
            "Legal business name (or your full name if sole proprietor)",
            "EIN or Social Security Number",
            "Business bank account & routing number",
            "Business address",
            "Phone number for verification",
          ].map(function(item){return(
            <div key={item} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 0",borderBottom:"1px solid #2A2A2A"}}>
              <span style={{color:"#22C55E",fontSize:14,flexShrink:0,marginTop:1}}>✓</span>
              <span style={{fontSize:12,color:"#AAA",lineHeight:1.5}}>{item}</span>
            </div>
          );})}
        </div>

        {/* Pricing note */}
        <div style={{background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.2)",borderRadius:10,padding:12,marginBottom:16}}>
          <div style={{fontFamily:"Arial Black,sans-serif",fontSize:11,fontWeight:900,color:"#22C55E",marginBottom:4}}>💰 STRIPE FEES</div>
          <div style={{fontSize:11,color:"#888",lineHeight:1.6}}>
            Stripe charges <strong style={{color:"#FFF"}}>0.25% + 25¢ per payout</strong> to cleaners. This is deducted from your account automatically. No monthly fees.
          </div>
        </div>

        <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",borderRadius:10,padding:12,marginBottom:8,fontSize:11,color:"#888",lineHeight:1.6}}>
          <span style={{color:"#F59E0B",fontWeight:700}}>📋 Demo Mode: </span>
          In production this opens Stripe's secure business onboarding. Tap below to simulate.
        </div>
      </div>

      <div style={{padding:"16px 24px 32px",borderTop:"1px solid #2A2A2A"}}>
        <button onClick={async function(){
          var acct="acct_mgr_"+Date.now();
          var updated=Object.assign({},user,{stripeBusinessStatus:"connected",stripeBusinessAccount:acct,stripe_business_status:"connected",stripe_business_account:acct});
          setUser(updated);
          setShowMgrStripe(false);
          setView("Dashboard");
          // Save to Supabase
          if(user&&user.id&&user.id.includes("-")){
            try{
              var {updateUserProfile}=await import("./lib/supabase.js");
              await updateUserProfile(user.id,{stripe_business_status:"connected",stripe_business_account:acct});
            }catch(e){console.error("Stripe save failed:",e.message);}
          }
        }} style={{width:"100%",background:"#635BFF",border:"none",borderRadius:10,padding:"16px",color:"#FFF",fontSize:14,fontWeight:900,fontFamily:"Arial Black,sans-serif",letterSpacing:.5,cursor:"pointer",marginBottom:10}}>
          💳 CONNECT STRIPE BUSINESS ACCOUNT
        </button>
        <button onClick={function(){setShowMgrStripe(false);}}
          style={{width:"100%",background:"transparent",border:"1px solid #333",borderRadius:10,padding:"12px",color:"#555",fontSize:12,cursor:"pointer"}}>
          Set up later (payouts will be blocked)
        </button>
        <div style={{fontSize:10,color:"#444",textAlign:"center",marginTop:8,lineHeight:1.5}}>
          ⚠️ You cannot approve & pay cleaners until Stripe is connected.
        </div>
      </div>
    </div>
  );

  if(user.role==="pending") return (
    <div><style>{css}</style>
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,textAlign:"center",fontFamily:"Inter,sans-serif"}}>
      <div style={{fontSize:48,marginBottom:16}}>⏳</div>
      <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:26,letterSpacing:2,color:"#FFF",marginBottom:10}}>APPLICATION PENDING</div>
      <div style={{fontSize:13,color:"#888",maxWidth:300,lineHeight:1.8,marginBottom:24}}>Your application is being reviewed. You will receive access once approved.</div>
      <button className="btn ghost" onClick={()=>setUser(null)}>Back to Login</button>
    </div></div>
  );


  function renderView(){
    if(!user)return null;
    if(user.role==="manager"){
        switch(view){
          case "Dashboard": return <Dashboard props={props} cleaners={cleaners} jobs={jobs} setView={setView} notifications={notifications} onSelectCleaner={(c)=>{setSelectedCleaner(c);setView("Team");}}/>;
          case "Properties": return <Properties props={props} setProps={setProps} cleaners={cleaners} user={user} availability={availability} addNotification={function(n){
              setNotifications(function(prev){return prev.concat([n]);});
              if(user&&user.id&&user.id.includes("-")){
                createNotification({
                  user_id:n.forCleaner||n.userId||user.id,
                  type:n.type||"info",
                  icon:n.icon||"🔔",
                  title:n.title,
                  body:n.body||null,
                  for_role:n.forRole||null,
                  nav_to:n.navTo||null,
                  read:false,
                }).catch(function(e){console.error("Notif save:",e.message);});
              }
            }} initialSel={selectedProp} onClearSel={function(){setSelectedProp(null);}}/>;
          case "Team": return <Cleaners cleaners={cleaners} setCleaners={setCleaners} jobs={jobs} pendingCleaners={pendingCleaners} setPendingCleaners={setPendingCleaners} allProps={props} setProps={setProps} user={user} availability={availability} initialSelected={selectedCleaner} onClearSelected={()=>setSelectedCleaner(null)}/>;
          case "Messages": return <Messages user={user} cleaners={cleaners} addNotification={function(n){
              setNotifications(function(prev){return prev.concat([n]);});
              if(user&&user.id&&user.id.includes("-")){
                createNotification({
                  user_id:n.forCleaner||n.userId||user.id,
                  type:n.type||"info",
                  icon:n.icon||"🔔",
                  title:n.title,
                  body:n.body||null,
                  for_role:n.forRole||null,
                  nav_to:n.navTo||null,
                  read:false,
                }).catch(function(e){console.error("Notif save:",e.message);});
              }
            }}/>;
          case "Calendar": return <Cal props={props} cleaners={cleaners} setProps={setProps} user={user} setView={setView} onSelectProp={function(id){setSelectedProp(id);setView("Properties");}} availability={availability} setAvailability={setAvailability}/>;
          case "Payroll": return <Payroll cleaners={cleaners} jobs={jobs}/>;
          case "Approvals": return <Approvals jobs={jobs} setJobs={setJobs} props={props} setProps={setProps} cleaners={cleaners} setCleaners={setCleaners} setView={setView} setNotifications={setNotifications} user={user} setShowMgrStripe={setShowMgrStripe} pendingRemovals={pendingRemovals} setPendingRemovals={setPendingRemovals}/>;
          case "Reports": return <Reports jobs={jobs} props={props} cleaners={cleaners}/>;
          case "Leaderboard": return <Leaderboard cleaners={cleaners} jobs={jobs} props={props}/>;
          case "My Profile": return <ProfilePage user={user} setUser={setUser} cleaners={cleaners} setCleaners={setCleaners} jobs={jobs} setShowMgrStripe={setShowMgrStripe}/>;
          case "Help & Support": return <Info user={user} managerPolicy={managerPolicy} setManagerPolicy={setManagerPolicy}/>;
          default: return null;
        }
      } else {
        switch(view){
          case "Home": return <CleanerDashboard user={user} cleaners={cleaners} jobs={jobs} props={props} setView={setView}/>;
          case "My Jobs": return <CleanerJobs user={user} props={props} setProps={setProps} jobs={jobs} setJobs={setJobs} cleaners={cleaners} pendingRemovals={pendingRemovals} setPendingRemovals={setPendingRemovals} addNotification={function(n){
              setNotifications(function(prev){return prev.concat([n]);});
              if(user&&user.id&&user.id.includes("-")){
                createNotification({
                  user_id:n.forCleaner||n.userId||user.id,
                  type:n.type||"info",
                  icon:n.icon||"🔔",
                  title:n.title,
                  body:n.body||null,
                  for_role:n.forRole||null,
                  nav_to:n.navTo||null,
                  read:false,
                }).catch(function(e){console.error("Notif save:",e.message);});
              }
            }}/>;
          case "My Earnings": return <CleanerEarnings user={user} cleaners={cleaners} jobs={jobs}/>;
          case "My Ratings": return <CleanerRatings user={user} cleaners={cleaners} jobs={jobs} props={props} setView={setView}/>;
          case "My Availability": return <CleanerAvailability user={user} availability={availability} setAvailability={setAvailability}/>;
          case "Messages": return <Messages user={user} cleaners={cleaners} addNotification={function(n){
              setNotifications(function(prev){return prev.concat([n]);});
              if(user&&user.id&&user.id.includes("-")){
                createNotification({
                  user_id:n.forCleaner||n.userId||user.id,
                  type:n.type||"info",
                  icon:n.icon||"🔔",
                  title:n.title,
                  body:n.body||null,
                  for_role:n.forRole||null,
                  nav_to:n.navTo||null,
                  read:false,
                }).catch(function(e){console.error("Notif save:",e.message);});
              }
            }}/>;
          case "Calendar": return <Cal props={props} cleaners={cleaners} setProps={setProps} user={user} setView={setView} myId={user.id} onSelectProp={function(id){setSelectedProp(id);setView("My Jobs");}} availability={availability} setAvailability={setAvailability}/>;
          case "Reports": return <Reports jobs={jobs} props={props} cleaners={cleaners}/>;
          case "Leaderboard": return <Leaderboard cleaners={cleaners} jobs={jobs} props={props}/>;
          case "My Profile": return <ProfilePage user={user} setUser={setUser} cleaners={cleaners} setCleaners={setCleaners} jobs={jobs} setShowMgrStripe={setShowMgrStripe}/>;
          case "Help & Support": return <Info user={user} managerPolicy={managerPolicy} setManagerPolicy={setManagerPolicy}/>;
          case "The Harvey System": return <HarveySystem user={user}/>;
          default: return <CleanerDashboard user={user} cleaners={cleaners} jobs={jobs} props={props} setView={setView}/>;
        }
      }
  }

  return (
    <div>
      <style>{css}</style>
      <div style={{minHeight:"100vh",background:C.bg}}>
        <TopBar view={view} setView={setView} user={user} notifs={pending}
          notifications={notifications.filter(function(n){
            if(!n.forRole||n.forRole==="both")return true;
            if(n.forRole==="manager")return user&&user.role==="manager";
            if(n.forRole==="cleaner")return user&&user.role==="cleaner"&&(!n.forCleaner||n.forCleaner===user.id);
            return true;
          })}
          onLogout={async function(){
            try{await signOut();}catch(e){}
            try{localStorage.removeItem("turnready_is_real_user");}catch(e){}
            setUser(null);
            setShowOnboarding(false);
            setOnboardingStep("welcome");
            setShowMgrStripe(false);
            setProps([]);
            setCleaners(INIT_CLEANERS);
            setJobs([]);
            setNotifications([]);
          }}
          openAI={function(){setShowAI(true);}} onBell={function(){setShowNotifs(true);}} darkMode={darkMode} setDarkMode={function(v){setDarkMode(v);try{localStorage.setItem("turnready_theme",v?"dark":"light");}catch(e){}}}/>
        <div style={{maxWidth:1080,margin:"0 auto",padding:"60px 16px 80px"}}>{renderView()}</div>
        {showNotifs&&<NotificationsPanel
          notifications={notifications.filter(function(n){
            if(!n.forRole||n.forRole==="both")return true;
            if(n.forRole==="manager")return user&&user.role==="manager";
            if(n.forRole==="cleaner")return user&&user.role==="cleaner"&&(!n.forCleaner||n.forCleaner===user.id);
            return true;
          })}
          setNotifications={setNotifications} onClose={()=>setShowNotifs(false)} user={user}
          setView={setView} setShowNotifs={setShowNotifs}/>}
        {showAI&&<AIChat onClose={()=>setShowAI(false)} user={user}/>}
      </div>
    </div>
  );
}
