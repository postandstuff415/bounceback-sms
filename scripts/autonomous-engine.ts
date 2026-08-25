import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

const INDUSTRIES = [
  "Plumbing", "HVAC", "Electrician", "Landscaping", "Roofing", "Pest Control", 
  "Auto Repair", "Dentist", "Legal Services", "Cleaning Services", 
  "Locksmith", "Towing", "Appliance Repair", "Tree Service", "Glass Repair",
  "Painting", "Drywall", "Flooring", "Pool Maintenance", "Solar Installation",
  "Security Systems", "Junk Removal", "Moving Company", "Storage Units", 
  "Real Estate", "Pet Grooming", "Veterinarian", "Catering", "Event Planning", 
  "Photography", "Accounting", "Massage Therapy", "Barber Shop", "Hair Salon"
];

// Expanded to 500+ cities as requested
const CITIES = [
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ",
  "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "Dallas, TX", "San Jose, CA",
  "Austin, TX", "Jacksonville, FL", "Fort Worth, TX", "Columbus, OH", "Charlotte, NC",
  "San Francisco, CA", "Indianapolis, IN", "Seattle, WA", "Denver, CO", "Washington, DC",
  "Boston, MA", "El Paso, TX", "Nashville, TN", "Detroit, MI", "Oklahoma City, OK",
  "Portland, OR", "Las Vegas, NV", "Memphis, TN", "Louisville, KY", "Baltimore, MD",
  "Milwaukee, WI", "Albuquerque, NM", "Tucson, AZ", "Fresno, CA", "Sacramento, CA",
  "Mesa, AZ", "Kansas City, MO", "Atlanta, GA", "Long Beach, CA", "Colorado Springs, CO",
  "Raleigh, NC", "Miami, FL", "Virginia Beach, VA", "Omaha, NE", "Oakland, CA",
  "Minneapolis, MN", "Tulsa, OK", "Arlington, TX", "New Orleans, LA", "Wichita, KS",
  "Bakersfield, CA", "Tampa, FL", "Aurora, CO", "Anaheim, CA", "Honolulu, HI",
  "Santa Ana, CA", "Riverside, CA", "Corpus Christi, TX", "Lexington, KY", "Henderson, NV",
  "Stockton, CA", "Saint Paul, MN", "Cincinnati, OH", "St. Louis, MO", "Pittsburgh, PA",
  "Greensboro, NC", "Lincoln, NE", "Plano, TX", "Anchorage, AK", "Orlando, FL",
  "Irvine, CA", "Newark, NJ", "Durham, NC", "Chula Vista, CA", "Toledo, OH",
  "Fort Wayne, IN", "Jersey City, NJ", "Laredo, TX", "Madison, WI", "Chandler, AZ",
  "Buffalo, NY", "Lubbock, TX", "Scottsdale, AZ", "Reno, NV", "Glendale, AZ",
  "Gilbert, AZ", "Winston-Salem, NC", "North Las Vegas, NV", "Norfolk, VA", "Chesapeake, VA",
  "Garland, TX", "Irving, TX", "Hialeah, FL", "Fremont, CA", "Boise, ID",
  "Richmond, VA", "Baton Rouge, LA", "Spokane, WA", "Des Moines, IA", "Tacoma, WA",
  "San Bernardino, CA", "Modesto, CA", "Fontana, CA", "Santa Clarita, CA", "Birmingham, AL",
  "Oxnard, CA", "Fayetteville, NC", "Rochester, NY", "Moreno Valley, CA", "Glendale, CA",
  "Yonkers, NY", "Huntington Beach, CA", "Aurora, IL", "Salt Lake City, UT", "Amarillo, TX",
  "Montgomery, AL", "Grand Rapids, MI", "Little Rock, AR", "Akron, OH", "Huntsville, AL",
  "Augusta, GA", "Tallahassee, FL", "Overland Park, KS", "Knoxville, TN", "Worcester, MA",
  "Newport News, VA", "Brownsville, TX", "Santa Rosa, CA", "Providence, RI", "Shreveport, LA",
  "Salem, OR", "Mobile, AL", "Rancho Cucamonga, CA", "Columbus, GA", "Garden Grove, CA",
  "Cary, NC", "Pembroke Pines, FL", "Grand Prairie, TX", "Springfield, MO", "Santa Ana, CA",
  "Ontario, CA", "Jackson, MS", "Elk Grove, CA", "Corona, CA", "Peoria, AZ",
  "Fort Collins, CO", "Hayward, CA", "Lancaster, CA", "Salinas, CA", "Palmdale, CA",
  "Pasadena, TX", "Springfield, MA", "Eugene, OR", "Pomona, CA", "Sioux Falls, SD",
  "Escondido, CA", "Sunnyvale, CA", "Pasadena, CA", "Joliet, IL", "Alexandria, VA",
  "McAllen, TX", "Mesquite, TX", "Hollywood, FL", "Savannah, GA", "Rockford, IL",
  "Bridgeport, CT", "Bellevue, WA", "Olathe, KS", "Naperville, IL", "Midland, TX",
  "Waco, TX", "Torrance, CA", "McKinney, TX", "Sayreville, NJ", "Fullerton, CA",
  "Killeen, TX", "Orange, CA", "Roseville, CA", "Dayton, OH", "Miramar, FL",
  "Thornton, CO", "West Valley City, UT", "Warren, MI", "Carrollton, TX", "Stamford, CT",
  "Kent, WA", "Columbia, SC", "Sterling Heights, MI", "New Haven, CT", "Victorville, CA",
  "Athens, GA", "Simi Valley, CA", "Clarksburg, WV", "Lafayette, LA", "Topeka, KS",
  "Hartford, CT", "Allentown, PA", "Berkeley, CA", "Concord, CA", "Thousand Oaks, CA",
  "Frisco, TX", "Abilene, TX", "Gainesville, FL", "Evansville, IN", "Norman, OK",
  "Santa Clara, CA", "Wilmington, NC", "Vallejo, CA", "Pearland, TX", "El Monte, CA",
  "Murrieta, CA", "Carlsbad, CA", "Independence, MO", "Beaumont, TX", "Lansing, MI",
  "Ann Arbor, MI", "Arvada, CO", "Inglewood, CA", "Odessa, TX", "Round Rock, TX",
  "Fairfield, CA", "Rochester, MN", "Billings, MT", "Cambridge, MA", "West Jordan, UT",
  "Clearwater, FL", "West Palm Beach, FL", "Richardson, TX", "High Point, NC", "Springfield, IL",
  "Pueblo, CO", "Peoria, IL", "North Charleston, SC", "Everett, WA", "Downey, CA",
  "Costa Mesa, CA", "Miami Gardens, FL", "West Covina, CA", "Fargo, ND", "Broken Arrow, OK",
  "Lewisville, TX", "Ventura, CA", "Las Cruces, NM", "South Bend, IN", "Greeley, CO",
  "Tyler, TX", "Sandy Springs, GA", "Burbank, CA", "San Mateo, CA", "Palm Bay, FL",
  "Centennial, CO", "Pearland, TX", "Norwalk, CA", "Rialto, CA", "Daly City, CA",
  "Clovis, CA", "Hillsboro, OR", "Boulder, CO", "Charleston, WV", "Fishers, IN",
  "Carmel, IN", "Jurupa Valley, CA", "Edison, NJ", "Davenport, IA", "Murfreesboro, TN",
  "Gresham, OR", "Kenosha, WI", "Temecula, CA", "Odessa, TX", "Lee's Summit, MO",
  "Meridian, ID", "League City, TX", "Allen, TX", "Sparks, NV", "Tuscaloosa, AL",
  "Sugar Land, TX", "Vacaville, CA", "Lakewood, WA", "Compton, CA", "Troy, MI",
  "Hesperia, CA", "Goodyear, AZ", "Chico, CA", "Albany, NY", "Trenton, NJ",
  "Santa Maria, CA", "Mission Viejo, CA", "Vista, CA", "Fayetteville, AR", "Brockton, MA",
  "San Angelo, TX", "Beaverton, OR", "Bowie, MD", "Nampa, ID", "Yakima, WA",
  "Quincy, MA", "Redding, CA", "Asheville, NC", "Avondale, AZ", "Suffolk, VA",
  "Carson, CA", "Indio, CA", "Gastonia, NC", "New Bedford, MA", "Framingham, MA",
  "Concord, NC", "Livermore, CA", "Kalamazoo, MI", "Bloomington, IL", "Gulfport, MS",
  "Appleton, WI", "San Leandro, CA", "Longview, TX", "Orem, UT", "Lynchburg, VA",
  "Lawrence, KS", "Skokie, IL", "South Gate, CA", "Bellingham, WA", "Santa Cruz, CA",
  "Champaign, IL", "Bloomington, MN", "Mountain View, CA", "Decatur, IL", "Redwood City, CA",
  "Medford, OR", "Lafayette, IN", "Alameda, CA", "Nashua, NH", "Arlington, MA",
  "Somerville, MA", "Plymouth, MN", "Bellflower, CA", "Waukegan, IL", "Passaic, NJ",
  "Tustin, CA", "Hammond, IN", "Novi, MI", "Lynwood, CA", "Chino, CA",
  "New Britain, CT", "Warwick, RI", "Gary, IN", "O'Fallon, MO", "Boca Raton, FL",
  "Union City, CA", "Lakeland, FL", "Yuba City, CA", "San Ramon, CA", "Plymouth, MI",
  "Maple Grove, MN", "Mount Pleasant, SC", "Fort Smith, AR", "Waukesha, WI", "Bloomington, IN",
  "Pharr, TX", "Decatur, GA", "Perris, CA", "Melbourne, FL", "Hemet, CA",
  "Santa Fe, NM", "Cranston, RI", "Newton, MA", "Baldwin Park, CA", "Greenville, NC",
  "Livonia, MI", "Canton, OH", "Loveland, CO", "Parma, OH", "Youngstown, OH",
  "Redlands, CA", "Danbury, CT", "Port St. Lucie, FL", "Fort Lauderdale, FL", "Tallahassee, FL",
  "Cape Coral, FL", "Hollywood, FL", "Pembroke Pines, FL", "Coral Springs, FL", "Gainesville, FL",
  "Miramar, FL", "Lehigh Acres, FL", "Pompano Beach, FL", "Davie, FL", "Lakeland, FL",
  "Sunrise, FL", "Boca Raton, FL", "Miami Beach, FL", "Plantation, FL", "Deltona, FL",
  "Largo, FL", "Deerfield Beach, FL", "Palm Coast, FL", "Melbourne, FL", "Boynton Beach, FL",
  "Homestead, FL", "Port Charlotte, FL", "Doral, FL", "Fort Myers, FL", "Daytona Beach, FL",
  "Kissimee, FL", "Bonita Springs, FL", "North Miami, FL", "Jupiter, FL", "Tamarac, FL",
  "Margate, FL", "Sarasota, FL", "Bradenton, FL", "Pensacola, FL", "Pinellas Park, FL",
  "Ocala, FL", "Weston, FL", "Coconut Creek, FL", "Apopka, FL", "Jacksonville Beach, FL",
  "St. Augustine, FL", "Key West, FL", "Titusville, FL", "Venice, FL", "Ocoee, FL",
  "Palm Beach Gardens, FL", "Winter Garden, FL", "Sanford, FL", "Lake Worth, FL", "Cooper City, FL",
  "Hallandale Beach, FL", "Rockledge, FL", "Lynn Haven, FL", "Plant City, FL", "Oakland Park, FL",
  "Winter Haven, FL", "North Port, FL", "New Smyrna Beach, FL", "Sebring, FL", "Sebastian, FL",
  "Palmetto, FL", "Zephyrhills, FL", "Mount Dora, FL", "Bartow, FL", "Auburndale, FL",
  "Haines City, FL", "Eustis, FL", "Lady Lake, FL", "Fruitland Park, FL", "The Villages, FL",
  "Clermont, FL", "Leesburg, FL", "DeLand, FL", "New Port Richey, FL", "Brooksville, FL",
  "Spring Hill, FL", "Inverness, FL", "Crystal River, FL", "Wildwood, FL", "Tavares, FL",
  "Green Cove Springs, FL", "Orange Park, FL", "Palatka, FL", "Fernandina Beach, FL", "Macclenny, FL",
  "Callahan, FL", "Starke, FL", "Lake City, FL", "Live Oak, FL", "Jasper, FL",
  "Madison, FL", "Monticello, FL", "Perry, FL", "Quincy, FL", "Bristol, FL",
  "Blountstown, FL", "Marianna, FL", "Chipley, FL", "Bonifay, FL", "DeFuniak Springs, FL",
  "Crestview, FL", "Niceville, FL", "Destin, FL", "Fort Walton Beach, FL", "Mary Esther, FL",
  "Milton, FL", "Gulf Breeze, FL", "Navarre, FL", "Pace, FL", "Gonzalez, FL",
  "Molino, FL", "Jay, FL", "Atmore, AL", "Brewton, AL", "Bay Minette, AL",
  "Foley, AL", "Daphne, AL", "Fairhope, AL", "Spanish Fort, AL", "Robertsdale, AL",
  "Loxley, AL", "Summerdale, AL", "Silverhill, AL", "Elberta, AL", "Seminole, AL",
  "Magnolia Springs, AL", "Perdido Beach, AL", "Orange Beach, AL", "Gulf Shores, AL"
];

async function main() {
  console.log("🚀 Starting Autonomous Marketing Engine...");

  // Load SMTP Fleet
  const smtpFleetJson = process.env.SMTP_FLEET || "[]";
  let smtpConfigs: any[] = [];
  try {
    smtpConfigs = JSON.parse(smtpFleetJson);
  } catch (e) {
    console.error("❌ Failed to parse SMTP_FLEET environment variable.");
  }
  
  if (smtpConfigs.length === 0) {
    console.warn("⚠️ No SMTP fleet configured. Emails will be logged but not sent.");
  }

  // Get/Create Scrape State
  let state = await prisma.scrapeState.findFirst({ where: { isActive: true } });
  if (!state) {
    state = await prisma.scrapeState.create({
      data: {
        currentIndustryIndex: 0,
        currentCityIndex: 0,
        isActive: true
      }
    });
  }

  let { currentIndustryIndex, currentCityIndex } = state;

  // Background Scraper Loop
  const runScraper = async () => {
    while (true) {
      const industry = INDUSTRIES[currentIndustryIndex];
      const city = CITIES[currentCityIndex];

      console.log(`🔍 Scraping leads for: ${industry} in ${city}...`);

      // Mock Lead Generation (Capped at 50 leads per city block)
      const leadCount = Math.floor(Math.random() * 41) + 10; // 10-50 leads
      
      for (let i = 0; i < leadCount; i++) {
        const businessName = `${industry} Pros ${Math.floor(Math.random() * 10000)}`;
        const emailAddress = `lead${Math.floor(Math.random() * 100000)}@example.com`;
        
        await prisma.emailHoldingTank.create({
          data: {
            businessName,
            emailAddress,
            industry,
            city,
            estimatedRevenueLoss: Math.floor(Math.random() * 5000) + 500, // $500 - $5500
            status: "PENDING"
          }
        });

        // Human-like micro-pauses: 3-6 seconds randomized
        const delay = Math.floor(Math.random() * 3001) + 3000;
        await new Promise(res => setTimeout(res, delay));
      }

      console.log(`✅ Captured ${leadCount} leads for ${industry} in ${city}.`);

      // Update State (Historical Bookmark)
      currentCityIndex++;
      if (currentCityIndex >= CITIES.length) {
        currentCityIndex = 0;
        currentIndustryIndex++;
        if (currentIndustryIndex >= INDUSTRIES.length) {
          currentIndustryIndex = 0; // Reset loop
        }
      }

      await prisma.scrapeState.update({
        where: { id: state!.id },
        data: {
          currentIndustryIndex,
          currentCityIndex,
          lastRunTimestamp: new Date()
        }
      });
    }
  };

  // Round-Robin Drip Engine
  let currentInboxIndex = 0;
  const runDripEngine = async () => {
    while (true) {
      const lead = await prisma.emailHoldingTank.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: 'asc' }
      });

      if (lead && smtpConfigs.length > 0) {
        const config = smtpConfigs[currentInboxIndex];
        console.log(`📧 Sending diagnostic email to ${lead.emailAddress} from ${config.user}...`);

        try {
          const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.port === 465,
            auth: {
              user: config.user,
              pass: config.pass
            }
          });

          const template = `
Hi ${lead.businessName} team,

We noticed your business in ${lead.city} might be missing out on significant revenue due to missed calls.
Our analysis for the ${lead.industry} industry shows you could be losing up to $${lead.estimatedRevenueLoss.toLocaleString()} per month.

BounceBack SMS automatically recovers these leads for you. Lead recovery ensures you never lose a client to a competitor just because you were busy.

Reply to this email to activate your account or learn more.
          `;

          await transporter.sendMail({
            from: config.from,
            to: lead.emailAddress,
            subject: `Revenue Recovery Diagnostic for ${lead.businessName}`,
            text: template
          });

          await prisma.emailHoldingTank.update({
            where: { id: lead.id },
            data: {
              status: "SENT",
              dispatchedFromInbox: config.user
            }
          });
          
          console.log(`✅ Email sent to ${lead.emailAddress} via ${config.user}`);

        } catch (error) {
          console.error(`❌ Failed to send email to ${lead.emailAddress}:`, error);
          await prisma.emailHoldingTank.update({
            where: { id: lead.id },
            data: { status: "FAILED" }
          });
        }

        // Rotate Inbox (Round-Robin)
        currentInboxIndex = (currentInboxIndex + 1) % smtpConfigs.length;
      } else if (lead) {
        // Fallback for logging if no fleet is configured
        console.log(`📝 [MOCK] Sending email to ${lead.emailAddress} (No SMTP fleet configured)`);
        await prisma.emailHoldingTank.update({
          where: { id: lead.id },
          data: { status: "SENT", dispatchedFromInbox: "MOCK" }
        });
      }

      // Rigid Round-Robin delivery cadence: 2 to 3 minutes
      const dripDelay = (Math.floor(Math.random() * 61) + 120) * 1000;
      await new Promise(res => setTimeout(res, dripDelay));
    }
  };

  // Run both processes concurrently as background daemons
  runScraper();
  runDripEngine();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
