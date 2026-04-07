// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

const MONTHLY_COST_PENCE = 300; // £3.00/month per number

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
        const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN')!;
        const STRIPE_KEY = Deno.env.get('PLATFORM_STRIPE_SECRET_KEY');
        const twilioBase = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}`;
        const twilioHeaders = {
            'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
            'Content-Type': 'application/x-www-form-urlencoded',
        };

        const body = await req.json();
        const { action } = body;

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           SEARCH AVAILABLE NUMBERS
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (action === 'searchNumbers') {
            const { contains, numberType } = body;
            const type = numberType || 'Local';
            const params = new URLSearchParams({
                VoiceEnabled: 'true',
            });
            // For UK numbers, use Contains with area code digits (AreaCode is US/Canada only)
            if (contains) params.set('Contains', contains);

            const url = `${twilioBase}/AvailablePhoneNumbers/GB/${type}.json?${params.toString()}`;
            const res = await fetch(url, {
                headers: { 'Authorization': twilioHeaders['Authorization'] },
            });
            const data = await res.json();

            if (!res.ok) {
                return jsonResponse({ error: data.message || 'Failed to search numbers' }, 400);
            }

            const numbers = (data.available_phone_numbers || []).map((n: any) => ({
                friendlyName: n.friendly_name,
                phoneNumber: n.phone_number,
                locality: n.locality || '',
                region: n.region || '',
                postalCode: n.postal_code || '',
                isoCountry: n.iso_country,
                capabilities: {
                    voice: n.capabilities?.voice ?? true,
                    sms: n.capabilities?.sms ?? true,
                    mms: n.capabilities?.mms ?? false,
                },
                addressRequirements: n.address_requirements || 'none',
            }));

            return jsonResponse({ numbers, monthlyCostPence: MONTHLY_COST_PENCE });
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CHECK COMPLIANCE STATUS (address + bundle)
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (action === 'getBundleStatus') {
            const numbersApiBase = 'https://numbers.twilio.com/v2/RegulatoryCompliance';
            const numbersAuth = { 'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`) };

            // Check address
            const addrListRes = await fetch(`${twilioBase}/Addresses.json?FriendlyName=CRM+Business+Address`, {
                headers: { 'Authorization': twilioHeaders['Authorization'] },
            });
            const addrListData = await addrListRes.json();
            const address = (addrListData.addresses || [])[0];

            // Check bundles
            const bundleListRes = await fetch(
                `${numbersApiBase}/Bundles?IsoCountry=GB&NumberType=local`,
                { headers: numbersAuth }
            );
            const bundleListData = await bundleListRes.json();
            const bundles = bundleListData.results || [];

            const approved = bundles.find((b: any) => b.status === 'twilio-approved');
            const pending = bundles.find((b: any) => b.status === 'pending-review');
            const draft = bundles.find((b: any) => b.status === 'draft');
            const bundle = approved || pending || draft;

            return jsonResponse({
                address: address ? {
                    sid: address.sid,
                    street: address.street,
                    city: address.city,
                    region: address.region,
                    postalCode: address.postal_code,
                    validated: address.validated,
                } : null,
                bundle: bundle ? {
                    sid: bundle.sid,
                    status: bundle.status,
                    friendlyName: bundle.friendly_name,
                } : null,
                status: approved ? 'approved' : pending ? 'pending-review' : draft ? 'draft' : 'none',
            });
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           REGISTER ADDRESS
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (action === 'registerAddress') {
            // Fetch business profile
            const { data: bizProfile } = await supabase
                .from('business_profile')
                .select('business_name, business_address_line_1, business_address_line_2, business_city, business_county, business_postcode, business_country')
                .limit(1)
                .single();

            if (!bizProfile?.business_address_line_1 || !bizProfile?.business_city || !bizProfile?.business_postcode) {
                return jsonResponse({
                    error: 'Please fill in your business address in Settings → Business Profile first (address, city, postcode required).'
                }, 400);
            }

            // Check if already registered
            const addrListRes = await fetch(`${twilioBase}/Addresses.json?FriendlyName=CRM+Business+Address`, {
                headers: { 'Authorization': twilioHeaders['Authorization'] },
            });
            const addrListData = await addrListRes.json();
            const existing = (addrListData.addresses || [])[0];
            if (existing) {
                return jsonResponse({
                    message: 'Address already registered.',
                    address: { sid: existing.sid, street: existing.street, city: existing.city, postalCode: existing.postal_code }
                });
            }

            // Create
            const addrBody = new URLSearchParams({
                CustomerName: bizProfile.business_name || 'Business',
                FriendlyName: 'CRM Business Address',
                Street: [bizProfile.business_address_line_1, bizProfile.business_address_line_2].filter(Boolean).join(', '),
                City: bizProfile.business_city,
                Region: bizProfile.business_county || bizProfile.business_city,
                PostalCode: bizProfile.business_postcode,
                IsoCountry: 'GB',
            });
            const addrRes = await fetch(`${twilioBase}/Addresses.json`, {
                method: 'POST',
                headers: twilioHeaders,
                body: addrBody.toString(),
            });
            const addrData = await addrRes.json();
            if (!addrRes.ok) {
                console.error('Twilio address error:', addrData);
                return jsonResponse({ error: addrData.message || 'Failed to register address' }, 400);
            }

            return jsonResponse({
                message: 'Address registered successfully.',
                address: { sid: addrData.sid, street: addrData.street, city: addrData.city, postalCode: addrData.postal_code }
            });
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CREATE BUNDLE
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (action === 'createBundle') {
            const numbersApiBase = 'https://numbers.twilio.com/v2/RegulatoryCompliance';
            const numbersAuth = { 'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`) };

            // Need address first
            const addrListRes = await fetch(`${twilioBase}/Addresses.json?FriendlyName=CRM+Business+Address`, {
                headers: { 'Authorization': twilioHeaders['Authorization'] },
            });
            const addrListData = await addrListRes.json();
            const addressSid = (addrListData.addresses || [])[0]?.sid;
            if (!addressSid) {
                return jsonResponse({ error: 'Please register a business address first.' }, 400);
            }

            // Use form data from wizard
            const {
                endUserType, numberType, firstName, lastName,
                contactEmail, phoneNumber: contactPhone,
                // Address fields
                addressStreet, addressStreet2, addressCity, addressRegion, addressPostalCode,
                // Document files (base64-encoded)
                identityDocType, identityFile, identityFileName, identityFileMime,
                addressDocType, addressProofFile, addressProofFileName, addressProofFileMime,
            } = body;
            const email = contactEmail || '';

            if (!email) {
                return jsonResponse({ error: 'Please provide a contact email.' }, 400);
            }

            // Check existing bundles
            const bundleListRes = await fetch(
                `${numbersApiBase}/Bundles?IsoCountry=GB&NumberType=local`,
                { headers: numbersAuth }
            );
            const bundleListData = await bundleListRes.json();
            const existingBundles = bundleListData.results || [];

            const approved = existingBundles.find((b: any) => b.status === 'twilio-approved');
            if (approved) {
                return jsonResponse({ status: 'approved', message: 'Bundle already approved.' });
            }

            const pendingExisting = existingBundles.find((b: any) => b.status === 'pending-review');
            if (pendingExisting) {
                return jsonResponse({ pending: true, message: 'Bundle already submitted and under review (1-3 business days).' }, 202);
            }

            // Delete stale drafts
            const drafts = existingBundles.filter((b: any) => b.status === 'draft');
            for (const draft of drafts) {
                await fetch(`${numbersApiBase}/Bundles/${draft.sid}`, {
                    method: 'DELETE', headers: numbersAuth,
                }).catch(() => {});
            }

            // Get regulation SID
            const resolvedNumberType = numberType || 'local';
            const regRes = await fetch(`${numbersApiBase}/Regulations?IsoCountry=GB&NumberType=${resolvedNumberType}`, { headers: numbersAuth });
            const regData = await regRes.json();
            const regulationSid = regData.results?.[0]?.sid;
            if (!regulationSid) {
                return jsonResponse({ error: 'Could not find UK local number regulations. Please contact support.' }, 500);
            }

            // Create bundle
            const bundleRes = await fetch(`${numbersApiBase}/Bundles`, {
                method: 'POST',
                headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    FriendlyName: `CRM UK ${resolvedNumberType.charAt(0).toUpperCase() + resolvedNumberType.slice(1)} Bundle`,
                    Email: email,
                    RegulationSid: regulationSid,
                    IsoCountry: 'GB',
                    NumberType: resolvedNumberType,
                }).toString(),
            });
            const bundleData = await bundleRes.json();
            if (!bundleRes.ok) {
                console.error('Bundle creation error:', bundleData);
                return jsonResponse({ error: bundleData.message || 'Failed to create regulatory bundle' }, 400);
            }
            const bundleSid = bundleData.sid;

            // Create End-User
            const endUserName = [firstName, lastName].filter(Boolean).join(' ') || 'Business';
            const resolvedEndUserType = endUserType || 'business';
            const endUserAttrs: Record<string, string> = resolvedEndUserType === 'business'
                ? { business_name: endUserName }
                : { first_name: firstName || '', last_name: lastName || '' };
            if (contactPhone) endUserAttrs.phone_number = contactPhone;
            if (email) endUserAttrs.email = email;

            const endUserRes = await fetch(`${numbersApiBase}/EndUsers`, {
                method: 'POST',
                headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    FriendlyName: endUserName,
                    Type: resolvedEndUserType,
                    'Attributes': JSON.stringify(endUserAttrs),
                }).toString(),
            });
            const endUserData = await endUserRes.json();
            if (!endUserRes.ok) {
                console.error('End-user error:', endUserData);
                return jsonResponse({ error: endUserData.message || 'Failed to create end-user' }, 400);
            }

            // ── Supporting Document 1: Address reference ──
            const addrDocRes = await fetch(`${numbersApiBase}/SupportingDocuments`, {
                method: 'POST',
                headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    FriendlyName: 'Address Proof',
                    Type: 'customer_profile_address',
                    'Attributes': JSON.stringify({ address_sids: [addressSid] }),
                }).toString(),
            });
            const addrDocData = await addrDocRes.json();
            if (!addrDocRes.ok) {
                console.error('Address doc error:', addrDocData);
                return jsonResponse({ error: addrDocData.message || 'Failed to create address document' }, 400);
            }

            // Helper: decode base64 to Uint8Array
            const base64ToBytes = (b64: string): Uint8Array => {
                const binaryStr = atob(b64);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
                return bytes;
            };

            const itemSids: string[] = [endUserData.sid, addrDocData.sid];

            // ── Supporting Document 2: Proof of Identity (file upload) ──
            if (identityFile) {
                const idFormData = new FormData();
                idFormData.append('FriendlyName', 'Proof of Identity');
                idFormData.append('Type', identityDocType || 'government_issued_id');
                idFormData.append('Attributes', JSON.stringify({
                    first_name: firstName || '',
                    last_name: lastName || '',
                }));
                const idFileBytes = base64ToBytes(identityFile);
                const idBlob = new Blob([idFileBytes], { type: identityFileMime || 'application/octet-stream' });
                idFormData.append('File', idBlob, identityFileName || 'identity_proof');

                const idDocRes = await fetch(`${numbersApiBase}/SupportingDocuments`, {
                    method: 'POST',
                    headers: { 'Authorization': numbersAuth['Authorization'] },
                    body: idFormData,
                });
                const idDocData = await idDocRes.json();
                console.log('Identity doc response:', JSON.stringify(idDocData));
                if (idDocRes.ok && idDocData.sid) {
                    itemSids.push(idDocData.sid);
                } else {
                    console.error('Identity doc upload error:', idDocData);
                }
            }

            // ── Supporting Document 3: Proof of Address (file upload) ──
            if (addressProofFile) {
                const addrProofFormData = new FormData();
                addrProofFormData.append('FriendlyName', 'Proof of Address');
                addrProofFormData.append('Type', addressDocType || 'utility_bill');
                addrProofFormData.append('Attributes', JSON.stringify({
                    address_sids: [addressSid],
                }));
                const addrFileBytes = base64ToBytes(addressProofFile);
                const addrBlob = new Blob([addrFileBytes], { type: addressProofFileMime || 'application/octet-stream' });
                addrProofFormData.append('File', addrBlob, addressProofFileName || 'address_proof');

                const addrProofDocRes = await fetch(`${numbersApiBase}/SupportingDocuments`, {
                    method: 'POST',
                    headers: { 'Authorization': numbersAuth['Authorization'] },
                    body: addrProofFormData,
                });
                const addrProofDocData = await addrProofDocRes.json();
                console.log('Address proof doc response:', JSON.stringify(addrProofDocData));
                if (addrProofDocRes.ok && addrProofDocData.sid) {
                    itemSids.push(addrProofDocData.sid);
                } else {
                    console.error('Address proof doc upload error:', addrProofDocData);
                }
            }

            // Assign all items to bundle
            for (const objectSid of itemSids) {
                const assignRes = await fetch(`${numbersApiBase}/Bundles/${bundleSid}/ItemAssignments`, {
                    method: 'POST',
                    headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ ObjectSid: objectSid }).toString(),
                });
                if (!assignRes.ok) {
                    const assignErr = await assignRes.json();
                    console.error('Assignment error:', assignErr);
                    // Continue assigning remaining items instead of failing
                }
            }

            // Submit for review
            const submitRes = await fetch(`${numbersApiBase}/Bundles/${bundleSid}/Evaluations`, {
                method: 'POST',
                headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            const submitData = await submitRes.json();
            console.log('Bundle evaluation response:', JSON.stringify(submitData));

            if (!submitRes.ok) {
                console.error('Evaluation submission failed:', submitData);
                // Try to update status manually
                await fetch(`${numbersApiBase}/Bundles/${bundleSid}`, {
                    method: 'POST',
                    headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ Status: 'pending-review' }).toString(),
                });
            }

            // Check final status
            const recheckRes = await fetch(`${numbersApiBase}/Bundles/${bundleSid}`, { headers: numbersAuth });
            const recheckBundle = await recheckRes.json();
            console.log('Bundle final status:', recheckBundle.status);

            if (recheckBundle.status === 'twilio-approved') {
                return jsonResponse({ status: 'approved', message: 'Bundle approved! You can now purchase UK phone numbers.' });
            }

            return jsonResponse({
                pending: true,
                message: 'Your compliance bundle has been submitted for review. This typically takes 1-3 business days.'
            }, 202);
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           PURCHASE NUMBER
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (action === 'purchaseNumber') {
            const { phoneNumber, friendlyName, forwardTo } = body;
            if (!phoneNumber) return jsonResponse({ error: 'phoneNumber required' }, 400);
            if (!STRIPE_KEY) return jsonResponse({ error: 'Platform Stripe not configured' }, 400);

            // Voice webhook URL — our phone-voice edge function
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const voiceUrl = `${supabaseUrl}/functions/v1/phone-voice`;
            const statusCallbackUrl = `${supabaseUrl}/functions/v1/phone-voice?type=status`;

            const numbersApiBase = 'https://numbers.twilio.com/v2/RegulatoryCompliance';
            const numbersAuth = { 'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`) };

            // Fetch business profile (needed for address + bundle)
            const { data: bizProfile } = await supabase
                .from('business_profile')
                .select('business_name, business_email, business_address_line_1, business_address_line_2, business_city, business_county, business_postcode, business_country')
                .limit(1)
                .single();

            if (!bizProfile?.business_address_line_1 || !bizProfile?.business_city || !bizProfile?.business_postcode) {
                return jsonResponse({
                    error: 'A business address is required to purchase UK phone numbers. Please fill in your address in Settings → Business Profile first.'
                }, 400);
            }

            // ── 0a. Get or create Twilio Address ──
            const addrListRes = await fetch(`${twilioBase}/Addresses.json?FriendlyName=CRM+Business+Address`, {
                headers: { 'Authorization': twilioHeaders['Authorization'] },
            });
            const addrListData = await addrListRes.json();
            let addressSid = (addrListData.addresses || [])[0]?.sid;

            if (!addressSid) {
                const addrBody = new URLSearchParams({
                    CustomerName: bizProfile.business_name || 'Business',
                    FriendlyName: 'CRM Business Address',
                    Street: [bizProfile.business_address_line_1, bizProfile.business_address_line_2].filter(Boolean).join(', '),
                    City: bizProfile.business_city,
                    Region: bizProfile.business_county || bizProfile.business_city,
                    PostalCode: bizProfile.business_postcode,
                    IsoCountry: 'GB',
                });
                const addrRes = await fetch(`${twilioBase}/Addresses.json`, {
                    method: 'POST',
                    headers: twilioHeaders,
                    body: addrBody.toString(),
                });
                const addrData = await addrRes.json();
                if (!addrRes.ok) {
                    console.error('Twilio address error:', addrData);
                    return jsonResponse({ error: addrData.message || 'Failed to register address' }, 400);
                }
                addressSid = addrData.sid;
            }

            // ── 0b. Get or create Regulatory Bundle (required for UK local numbers) ──
            const bundleListRes = await fetch(
                `${numbersApiBase}/Bundles?IsoCountry=GB&NumberType=local`,
                { headers: numbersAuth }
            );
            const bundleListData = await bundleListRes.json();
            const existingBundles = bundleListData.results || [];
            let bundle = existingBundles.find((b: any) => b.status === 'twilio-approved')
                        || existingBundles.find((b: any) => b.status === 'pending-review');

            if (bundle && bundle.status === 'pending-review') {
                return jsonResponse({
                    pending: true,
                    message: 'Your regulatory compliance bundle is currently under review (usually 1-3 business days). You will be able to purchase numbers once it is approved.'
                }, 202);
            }

            if (!bundle) {
                // Delete any stale draft bundles from previous attempts
                const drafts = existingBundles.filter((b: any) => b.status === 'draft');
                for (const draft of drafts) {
                    await fetch(`${numbersApiBase}/Bundles/${draft.sid}`, {
                        method: 'DELETE',
                        headers: numbersAuth,
                    }).catch(() => {});
                }

                // Step 1: Get the regulation SID for GB local numbers
                const regRes = await fetch(`${numbersApiBase}/Regulations?IsoCountry=GB&NumberType=local`, { headers: numbersAuth });
                const regData = await regRes.json();
                const regulationSid = regData.results?.[0]?.sid;
                if (!regulationSid) {
                    return jsonResponse({ error: 'Could not find UK local number regulations. Please contact support.' }, 500);
                }

                // Step 2: Create a fresh bundle
                const bundleRes = await fetch(`${numbersApiBase}/Bundles`, {
                    method: 'POST',
                    headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        FriendlyName: 'CRM UK Local Bundle',
                        Email: bizProfile.business_email || '',
                        RegulationSid: regulationSid,
                        IsoCountry: 'GB',
                        NumberType: 'local',
                    }).toString(),
                });
                const bundleData = await bundleRes.json();
                if (!bundleRes.ok) {
                    console.error('Bundle creation error:', bundleData);
                    return jsonResponse({ error: bundleData.message || 'Failed to create regulatory bundle' }, 400);
                }
                const bundleSid = bundleData.sid;

                // Step 3: Create End-User
                const endUserRes = await fetch(`${numbersApiBase}/EndUsers`, {
                    method: 'POST',
                    headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        FriendlyName: bizProfile.business_name || 'Business',
                        Type: 'business',
                        'Attributes': JSON.stringify({
                            business_name: bizProfile.business_name || 'Business',
                        }),
                    }).toString(),
                });
                const endUserData = await endUserRes.json();
                if (!endUserRes.ok) {
                    console.error('End-user creation error:', endUserData);
                    return jsonResponse({ error: endUserData.message || 'Failed to create end-user record' }, 400);
                }

                // Step 4: Create Supporting Document referencing the Twilio Address
                const addrDocRes = await fetch(`${numbersApiBase}/SupportingDocuments`, {
                    method: 'POST',
                    headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        FriendlyName: 'Business Address Proof',
                        Type: 'customer_profile_address',
                        'Attributes': JSON.stringify({
                            address_sids: [addressSid],
                        }),
                    }).toString(),
                });
                const addrDocData = await addrDocRes.json();
                if (!addrDocRes.ok) {
                    console.error('Address doc creation error:', addrDocData);
                    return jsonResponse({ error: addrDocData.message || 'Failed to create address document' }, 400);
                }

                // Step 5: Assign end-user and address document to bundle
                for (const objectSid of [endUserData.sid, addrDocData.sid]) {
                    const assignRes = await fetch(`${numbersApiBase}/Bundles/${bundleSid}/ItemAssignments`, {
                        method: 'POST',
                        headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ ObjectSid: objectSid }).toString(),
                    });
                    if (!assignRes.ok) {
                        const assignErr = await assignRes.json();
                        console.error('Item assignment error:', assignErr);
                        return jsonResponse({ error: assignErr.message || 'Failed to assign items to regulatory bundle' }, 400);
                    }
                }

                // Step 5: Submit the bundle for review
                const submitRes = await fetch(`${numbersApiBase}/Bundles/${bundleSid}/Evaluations`, {
                    method: 'POST',
                    headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                });
                const submitData = await submitRes.json();
                console.log('Bundle evaluation result:', JSON.stringify(submitData));

                // Re-fetch bundle to check if auto-approved
                const recheckRes = await fetch(`${numbersApiBase}/Bundles/${bundleSid}`, { headers: numbersAuth });
                bundle = await recheckRes.json();
                console.log('Bundle status after evaluation:', bundle.status);

                if (bundle.status !== 'twilio-approved') {
                    return jsonResponse({
                        pending: true,
                        message: `Your regulatory compliance bundle has been submitted for review. This typically takes 1-3 business days. You'll be able to purchase numbers once approved.`
                    }, 202);
                }
            }

            // ── 1. Provision number in Twilio ──
            const provisionBody = new URLSearchParams({
                PhoneNumber: phoneNumber,
                FriendlyName: friendlyName || phoneNumber,
                VoiceUrl: voiceUrl,
                VoiceMethod: 'POST',
                StatusCallback: statusCallbackUrl,
                StatusCallbackMethod: 'POST',
                AddressSid: addressSid,
                BundleSid: bundle.sid,
            });

            const twilioRes = await fetch(`${twilioBase}/IncomingPhoneNumbers.json`, {
                method: 'POST',
                headers: twilioHeaders,
                body: provisionBody.toString(),
            });
            const twilioData = await twilioRes.json();

            if (!twilioRes.ok) {
                console.error('Twilio provision error:', twilioData);
                return jsonResponse({ error: twilioData.message || 'Failed to provision number' }, 400);
            }

            // 2. Create Stripe subscription
            // First create a product + price
            const productBody = new URLSearchParams({
                'name': `Phone Number: ${phoneNumber}`,
                'metadata[phone_number]': phoneNumber,
            });
            const productRes = await fetch('https://api.stripe.com/v1/products', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${STRIPE_KEY}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: productBody.toString(),
            });
            const product = await productRes.json();

            const priceBody = new URLSearchParams({
                'product': product.id,
                'unit_amount': String(MONTHLY_COST_PENCE),
                'currency': 'gbp',
                'recurring[interval]': 'month',
            });
            const priceRes = await fetch('https://api.stripe.com/v1/prices', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${STRIPE_KEY}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: priceBody.toString(),
            });
            const price = await priceRes.json();

            // Create or find a customer
            // Look for existing customer in business profile
            const { data: profile } = await supabase
                .from('business_profile')
                .select('id, business_name, business_email, stripe_customer_id')
                .limit(1)
                .single();

            let customerId = profile?.stripe_customer_id;

            if (!customerId) {
                const custBody = new URLSearchParams({
                    'email': profile?.business_email || '',
                    'name': profile?.business_name || 'CRM Customer',
                    'metadata[source]': 'crm_phone_numbers',
                });
                const custRes = await fetch('https://api.stripe.com/v1/customers', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${STRIPE_KEY}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: custBody.toString(),
                });
                const customer = await custRes.json();
                customerId = customer.id;

                // Save customer ID to business profile
                if (profile?.id) {
                    await supabase
                        .from('business_profile')
                        .update({ stripe_customer_id: customerId })
                        .eq('id', profile.id);
                }
            }

            // Create subscription (first month paid immediately)
            const subBody = new URLSearchParams({
                'customer': customerId!,
                'items[0][price]': price.id,
                'payment_behavior': 'default_incomplete',
                'metadata[phone_number]': phoneNumber,
                'metadata[twilio_sid]': twilioData.sid,
            });
            const subRes = await fetch('https://api.stripe.com/v1/subscriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${STRIPE_KEY}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: subBody.toString(),
            });
            const subscription = await subRes.json();

            // 3. Save to database
            const capabilities = {
                voice: twilioData.capabilities?.voice ?? true,
                sms: twilioData.capabilities?.sms ?? true,
                mms: twilioData.capabilities?.mms ?? false,
            };

            const { data: phoneRecord, error: insertErr } = await supabase
                .from('phone_numbers')
                .insert({
                    phone_number: phoneNumber,
                    friendly_name: friendlyName || '',
                    twilio_sid: twilioData.sid,
                    number_type: 'local',
                    capabilities,
                    status: 'active',
                    forward_to: forwardTo || null,
                    forward_enabled: !!forwardTo,
                    monthly_cost_pence: MONTHLY_COST_PENCE,
                    stripe_subscription_id: subscription.id || null,
                    stripe_price_id: price.id || null,
                    next_billing_date: subscription.current_period_end
                        ? new Date(subscription.current_period_end * 1000).toISOString()
                        : null,
                })
                .select()
                .single();

            if (insertErr) {
                console.error('DB insert error:', insertErr);
                return jsonResponse({ error: insertErr.message }, 500);
            }

            return jsonResponse({ ok: true, phoneNumber: phoneRecord });
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           UPDATE NUMBER SETTINGS
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (action === 'updateNumber') {
            const { numberId, forwardTo, forwardEnabled, friendlyName, voicemailEnabled, recordingEnabled } = body;
            if (!numberId) return jsonResponse({ error: 'numberId required' }, 400);

            // Get current record
            const { data: record } = await supabase
                .from('phone_numbers')
                .select('*')
                .eq('id', numberId)
                .single();

            if (!record) return jsonResponse({ error: 'Number not found' }, 404);

            // Build update payload
            const updates: Record<string, any> = { updated_at: new Date().toISOString() };
            if (forwardTo !== undefined) updates.forward_to = forwardTo || null;
            if (forwardEnabled !== undefined) updates.forward_enabled = forwardEnabled;
            if (friendlyName !== undefined) updates.friendly_name = friendlyName;
            if (voicemailEnabled !== undefined) updates.voicemail_enabled = voicemailEnabled;
            if (recordingEnabled !== undefined) updates.recording_enabled = recordingEnabled;

            // Update in DB
            const { error: updateErr } = await supabase
                .from('phone_numbers')
                .update(updates)
                .eq('id', numberId);

            if (updateErr) return jsonResponse({ error: updateErr.message }, 500);

            // If forwarding changed, update Twilio VoiceUrl (the webhook will read DB for latest config)
            // No Twilio API call needed — the phone-voice function reads from DB on each call

            return jsonResponse({ ok: true });
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           RELEASE NUMBER
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (action === 'releaseNumber') {
            const { numberId } = body;
            if (!numberId) return jsonResponse({ error: 'numberId required' }, 400);

            const { data: record } = await supabase
                .from('phone_numbers')
                .select('*')
                .eq('id', numberId)
                .single();

            if (!record) return jsonResponse({ error: 'Number not found' }, 404);

            // 1. Release from Twilio
            if (record.twilio_sid) {
                const releaseRes = await fetch(`${twilioBase}/IncomingPhoneNumbers/${record.twilio_sid}.json`, {
                    method: 'DELETE',
                    headers: { 'Authorization': twilioHeaders['Authorization'] },
                });
                if (!releaseRes.ok && releaseRes.status !== 404) {
                    const errData = await releaseRes.json().catch(() => ({}));
                    console.error('Twilio release error:', errData);
                }
            }

            // 2. Cancel Stripe subscription
            if (record.stripe_subscription_id && STRIPE_KEY) {
                await fetch(`https://api.stripe.com/v1/subscriptions/${record.stripe_subscription_id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${STRIPE_KEY}` },
                }).catch(err => console.error('Stripe cancel error:', err));
            }

            // 3. Mark as released in DB
            await supabase
                .from('phone_numbers')
                .update({ status: 'released', updated_at: new Date().toISOString() })
                .eq('id', numberId);

            return jsonResponse({ ok: true });
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           GET ALL NUMBERS
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (action === 'getNumbers') {
            const { data: numbers } = await supabase
                .from('phone_numbers')
                .select('*')
                .neq('status', 'released')
                .order('created_at', { ascending: true });

            return jsonResponse({ numbers: numbers || [] });
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           GET CALL LOGS
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (action === 'getCallLogs') {
            const { numberId, limit: logLimit, offset } = body;

            let query = supabase
                .from('phone_call_logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .limit(logLimit || 50)
                .range(offset || 0, (offset || 0) + (logLimit || 50) - 1);

            if (numberId) {
                query = query.eq('phone_number_id', numberId);
            }

            const { data: logs, count } = await query;
            return jsonResponse({ logs: logs || [], total: count || 0 });
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           GET USAGE SUMMARY
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (action === 'getUsage') {
            const { numberId, months } = body;
            const monthsBack = months || 6;
            const since = new Date();
            since.setMonth(since.getMonth() - monthsBack);
            const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-01`;

            let query = supabase
                .from('phone_usage_summary')
                .select('*')
                .gte('month', sinceStr)
                .order('month', { ascending: true });

            if (numberId) {
                query = query.eq('phone_number_id', numberId);
            }

            const { data: usage } = await query;

            // Also get aggregate stats from call logs
            let statsQuery = supabase
                .from('phone_call_logs')
                .select('direction, duration_seconds, status')
                .gte('created_at', sinceStr);
            if (numberId) {
                statsQuery = statsQuery.eq('phone_number_id', numberId);
            }

            const { data: allLogs } = await statsQuery;
            const stats = {
                totalCalls: allLogs?.length || 0,
                totalMinutes: Math.round((allLogs?.reduce((acc, l) => acc + (l.duration_seconds || 0), 0) || 0) / 60),
                inboundCalls: allLogs?.filter(l => l.direction === 'inbound').length || 0,
                outboundCalls: allLogs?.filter(l => l.direction === 'outbound').length || 0,
                completedCalls: allLogs?.filter(l => l.status === 'completed').length || 0,
                missedCalls: allLogs?.filter(l => l.status === 'no-answer' || l.status === 'busy').length || 0,
            };

            return jsonResponse({ usage: usage || [], stats });
        }

        return jsonResponse({ error: `Unknown action: ${action}` }, 400);

    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('phone-numbers error:', errMsg, err);
        return jsonResponse({ error: errMsg || 'Internal server error' }, 500);
    }
});
