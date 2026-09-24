import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function diagnose() {
  const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const serverKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;

  console.log('--- DIAGNOSTIC START ---');
  console.log('Browser key present:', Boolean(browserKey), 'length:', browserKey?.length);
  console.log('Server key present:', Boolean(serverKey), 'length:', serverKey?.length);

  if (!browserKey) {
    console.error('ERROR: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set');
    return;
  }

  // 1. Test Maps JS script with Referer http://localhost:3000
  try {
    const jsUrl = `https://maps.googleapis.com/maps/api/js?key=${browserKey}&libraries=places&v=weekly`;
    const resLocal = await fetch(jsUrl, {
      headers: { Referer: 'http://localhost:3000/' }
    });
    console.log('\n[1] Maps JS Script fetch (Referer: http://localhost:3000/):');
    console.log('Status:', resLocal.status, resLocal.statusText);
    const bodyLocal = await resLocal.text();
    // Check if script body contains Google error message
    const hasError = bodyLocal.includes('google.maps.Load(') || bodyLocal.includes('ErrorMessage') || bodyLocal.includes('ApiNotActivatedMapError') || bodyLocal.includes('RefererNotAllowedMapError') || bodyLocal.includes('DeletedKeyMapError');
    const match = bodyLocal.match(/AuthenticationError|ApiNotActivatedMapError|RefererNotAllowedMapError|DeletedKeyMapError|InvalidKeyMapError/g);
    console.log('Script length:', bodyLocal.length, 'Auth error detected in script:', match || 'None');
    if (match) {
      console.log('Preview:', bodyLocal.slice(0, 300));
    }
  } catch (e: any) {
    console.error('Failed to fetch Maps JS:', e.message);
  }

  // 2. Test Maps JS script with Referer https://exora-beta.vercel.app/
  try {
    const jsUrl = `https://maps.googleapis.com/maps/api/js?key=${browserKey}&libraries=places&v=weekly`;
    const resProd = await fetch(jsUrl, {
      headers: { Referer: 'https://exora-beta.vercel.app/admin/exhibitions/new' }
    });
    console.log('\n[2] Maps JS Script fetch (Referer: https://exora-beta.vercel.app/):');
    console.log('Status:', resProd.status, resProd.statusText);
    const bodyProd = await resProd.text();
    const matchProd = bodyProd.match(/AuthenticationError|ApiNotActivatedMapError|RefererNotAllowedMapError|DeletedKeyMapError|InvalidKeyMapError/g);
    console.log('Script length:', bodyProd.length, 'Auth error detected in script:', matchProd || 'None');
  } catch (e: any) {
    console.error('Failed to fetch Maps JS prod referer:', e.message);
  }

  // 3. Test Places API (New) REST endpoint with browser key
  try {
    const placesUrl = `https://places.googleapis.com/v1/places:autocomplete`;
    const resPlaces = await fetch(placesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': browserKey,
        'Referer': 'https://exora-beta.vercel.app/',
      },
      body: JSON.stringify({
        input: 'Bangalore International Exhibition Centre',
      })
    });
    console.log('\n[3] Places API (New) REST Autocomplete with Browser Key:');
    console.log('Status:', resPlaces.status, resPlaces.statusText);
    const placesData = await resPlaces.json();
    console.log('Response:', JSON.stringify(placesData, null, 2));
  } catch (e: any) {
    console.error('Failed to call Places API (New) with browser key:', e.message);
  }

  // 4. Test Places API (New) REST endpoint with server key
  if (serverKey) {
    try {
      const placesUrl = `https://places.googleapis.com/v1/places:autocomplete`;
      const resPlacesServer = await fetch(placesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': serverKey,
        },
        body: JSON.stringify({
          input: 'Bangalore International Exhibition Centre',
        })
      });
      console.log('\n[4] Places API (New) REST Autocomplete with Server Key:');
      console.log('Status:', resPlacesServer.status, resPlacesServer.statusText);
      const serverData = await resPlacesServer.json();
      console.log('Response:', JSON.stringify(serverData, null, 2));
    } catch (e: any) {
      console.error('Failed to call Places API (New) with server key:', e.message);
    }
  }

  // 5. Test Geocoding API with server key
  if (serverKey) {
    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Bengaluru&key=${serverKey}`;
      const resGeo = await fetch(geoUrl);
      const geoData = await resGeo.json();
      console.log('\n[5] Geocoding API with Server Key:');
      console.log('Status:', geoData.status, 'Results count:', geoData.results?.length);
      if (geoData.error_message) {
        console.log('Geocoding error message:', geoData.error_message);
      }
    } catch (e: any) {
      console.error('Failed geocoding:', e.message);
    }
  }

  // 6. Test Legacy Places API Autocomplete with server key
  if (serverKey) {
    try {
      const legacyUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Bangalore&key=${serverKey}`;
      const resLegacy = await fetch(legacyUrl);
      const legacyData = await resLegacy.json();
      console.log('\n[6] Legacy Places API with Server Key:');
      console.log('Status:', legacyData.status, 'Predictions count:', legacyData.predictions?.length);
      if (legacyData.error_message) {
        console.log('Legacy error message:', legacyData.error_message);
      }
    } catch (e: any) {
      console.error('Failed legacy places:', e.message);
    }
  }

  console.log('\n--- DIAGNOSTIC END ---');
}

diagnose();
