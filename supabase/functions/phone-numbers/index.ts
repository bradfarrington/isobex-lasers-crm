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
        // Admin email for Twilio bundle notifications — keeps Twilio invisible to end users
        const twilioNotificationEmail = Deno.env.get('TWILIO_NOTIFICATION_EMAIL') || '';
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

            // Get the stored bundle SID from the database
            const { data: bizProfile } = await supabase
                .from('business_profile')
                .select('twilio_bundle_sid')
                .limit(1)
                .single();

            let bundle: any = null;
            let status = 'none';

            if (bizProfile?.twilio_bundle_sid) {
                // Fetch the SPECIFIC bundle by its stored SID
                const bundleRes = await fetch(
                    `${numbersApiBase}/Bundles/${bizProfile.twilio_bundle_sid}`,
                    { headers: numbersAuth }
                );
                if (bundleRes.ok) {
                    bundle = await bundleRes.json();
                    console.log(`Bundle ${bundle.sid} status: ${bundle.status}`);
                    // Map Twilio status to our status
                    if (bundle.status === 'twilio-approved') status = 'approved';
                    else if (bundle.status === 'pending-review' || bundle.status === 'in-review') status = 'pending-review';
                    else if (bundle.status === 'twilio-rejected') status = 'rejected';
                    else if (bundle.status === 'draft') status = 'draft';
                    else status = bundle.status; // pass through any other status
                } else {
                    console.error('Failed to fetch stored bundle:', bizProfile.twilio_bundle_sid);
                }
            } else {
                console.log('No twilio_bundle_sid stored in business_profile — showing none.');
            }

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
                status,
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
            // File uploads MUST use the numbers-upload subdomain per Twilio docs
            const numbersUploadBase = 'https://numbers-upload.twilio.com/v2/RegulatoryCompliance';
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
                phoneNumber: contactPhone,
                // Address fields
                addressStreet, addressStreet2, addressCity, addressRegion, addressPostalCode,
                // Document files (base64-encoded)
                identityDocType, identityFile, identityFileName, identityFileMime,
                addressDocType, addressProofFile, addressProofFileName, addressProofFileMime,
            } = body;

            // All bundle notifications MUST go to the platform admin email
            // This keeps Twilio completely invisible to end users
            if (!twilioNotificationEmail) {
                console.error('TWILIO_NOTIFICATION_EMAIL env var is not set — cannot create bundle');
                return jsonResponse({ error: 'Platform notification email is not configured. Please contact support.' }, 500);
            }
            const bundleEmail = twilioNotificationEmail;
            console.log('Bundle notification email: using admin override —', bundleEmail);

            // Check if we already have a stored bundle
            const { data: existingProfile } = await supabase
                .from('business_profile')
                .select('twilio_bundle_sid')
                .limit(1)
                .single();

            if (existingProfile?.twilio_bundle_sid) {
                const existingBundleRes = await fetch(
                    `${numbersApiBase}/Bundles/${existingProfile.twilio_bundle_sid}`,
                    { headers: numbersAuth }
                );
                if (existingBundleRes.ok) {
                    const existingBundle = await existingBundleRes.json();
                    if (existingBundle.status === 'twilio-approved') {
                        return jsonResponse({ status: 'approved', message: 'Bundle already approved.' });
                    }
                    if (existingBundle.status === 'pending-review' || existingBundle.status === 'in-review') {
                        return jsonResponse({ pending: true, message: 'Bundle already submitted and under review (1-3 business days).' }, 202);
                    }
                    // If the stored bundle is a draft, delete it so we can create a fresh one
                    if (existingBundle.status === 'draft') {
                        console.log('Deleting stale draft bundle:', existingProfile.twilio_bundle_sid);
                        await fetch(`${numbersApiBase}/Bundles/${existingProfile.twilio_bundle_sid}`, {
                            method: 'DELETE', headers: numbersAuth,
                        }).catch(() => {});
                    }
                }
            }

            // Get regulation SID with constraints to learn the required document types
            const resolvedNumberType = numberType || 'local';
            const resolvedEndUserTypeForReg = endUserType || 'business';
            const regRes = await fetch(
                `${numbersApiBase}/Regulations?IsoCountry=GB&NumberType=${resolvedNumberType}&EndUserType=${resolvedEndUserTypeForReg}&IncludeConstraints=true`,
                { headers: numbersAuth }
            );
            const regData = await regRes.json();
            console.log('Regulation query result count:', regData.results?.length);
            const regulation = regData.results?.[0];
            const regulationSid = regulation?.sid;
            if (!regulationSid) {
                return jsonResponse({ error: 'Could not find UK local number regulations. Please contact support.' }, 500);
            }

            // Extract the required document types from the regulation constraints
            // The regulation tells us exactly what types of supporting documents are needed
            const supportingDocReqs = regulation.requirements?.supporting_document || [];
            console.log('Regulation requirements:', JSON.stringify(regulation.requirements));

            // Find ALL required document types from the regulation requirements
            let requiresAddressSid = false; // whether to assign the AD SID directly
            let identityDocTypeFromReg = ''; // type for identity proof file upload
            let addressProofDocTypeFromReg = ''; // type for address proof file upload
            for (const reqGroup of supportingDocReqs) {
                const group = Array.isArray(reqGroup) ? reqGroup : [reqGroup];
                for (const req of group) {
                    const accepted = req.accepted_documents || [];
                    const firstType = accepted.length > 0 ? accepted[0].type : '';
                    const reqName = (req.requirement_name || '').toLowerCase();
                    const name = (req.name || '').toLowerCase();

                    // Log each requirement for debugging
                    console.log(`Regulation doc requirement: name="${req.name}", requirement_name="${req.requirement_name}", accepted_types=[${accepted.map((a: any) => a.type).join(', ')}]`);

                    // Address resource (AD SID assigned directly)
                    if (firstType === 'address') {
                        requiresAddressSid = true;
                    }
                    // Address proof FILE — match by name/requirement containing 'address'
                    else if (name.includes('address') || reqName.includes('address')) {
                        // Use the frontend-selected type if it's in the accepted list, otherwise use first accepted
                        const acceptedTypes = accepted.map((a: any) => a.type);
                        if (acceptedTypes.includes(addressDocType)) {
                            addressProofDocTypeFromReg = addressDocType;
                        } else {
                            addressProofDocTypeFromReg = firstType || '';
                        }
                    }
                    // Identity proof FILE — match by name/requirement containing 'identity' or 'id'
                    else if (name.includes('identity') || name.includes('government')
                        || reqName.includes('identity') || reqName.includes('proof_of_id')) {
                        const acceptedTypes = accepted.map((a: any) => a.type);
                        if (acceptedTypes.includes(identityDocType)) {
                            identityDocTypeFromReg = identityDocType;
                        } else {
                            identityDocTypeFromReg = firstType || '';
                        }
                    }
                    // Catch-all
                    else if (firstType) {
                        console.log(`Unmatched regulation requirement: ${req.requirement_name} / ${req.name} -> type: ${firstType}`);
                    }
                }
            }
            console.log('Requires Address SID:', requiresAddressSid);
            console.log('Using identity document type:', identityDocTypeFromReg || '(using frontend value)');
            console.log('Using address proof file type:', addressProofDocTypeFromReg || '(not required)');

            // Build the status callback URL so Twilio posts bundle status changes
            // to our webhook instead of sending emails
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const bundleStatusCallbackUrl = `${supabaseUrl}/functions/v1/bundle-status`;

            // Create bundle
            const bundleRes = await fetch(`${numbersApiBase}/Bundles`, {
                method: 'POST',
                headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    FriendlyName: `Isobex Lasers UK ${resolvedNumberType.charAt(0).toUpperCase() + resolvedNumberType.slice(1)} Bundle`,
                    Email: bundleEmail,
                    RegulationSid: regulationSid,
                    IsoCountry: 'GB',
                    NumberType: resolvedNumberType,
                    StatusCallback: bundleStatusCallbackUrl,
                }).toString(),
            });
            const bundleData = await bundleRes.json();
            if (!bundleRes.ok) {
                console.error('Bundle creation error:', bundleData);
                return jsonResponse({ error: bundleData.message || 'Failed to create regulatory bundle' }, 400);
            }
            const bundleSid = bundleData.sid;

            // Create End-User
            const { businessName } = body;
            const resolvedEndUserType = endUserType || 'individual';
            const endUserName = resolvedEndUserType === 'business'
                ? (businessName || [firstName, lastName].filter(Boolean).join(' ') || 'Business')
                : ([firstName, lastName].filter(Boolean).join(' ') || 'Individual');
            const endUserAttrs: Record<string, string> = resolvedEndUserType === 'business'
                ? { business_name: businessName || endUserName }
                : { first_name: firstName || '', last_name: lastName || '', email: bundleEmail };
            if (contactPhone) endUserAttrs.phone_number = contactPhone;

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

            // ── Address: Only assign AD SID if the regulation requires it ──
            if (requiresAddressSid) {
                console.log('Assigning Address SID directly:', addressSid);
            } else {
                console.log('Regulation does not require Address SID assignment — skipping.');
            }

            // Helper: decode base64 to Uint8Array
            const base64ToBytes = (b64: string): Uint8Array => {
                const binaryStr = atob(b64);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
                return bytes;
            };

            const itemSids: string[] = [endUserData.sid];
            if (requiresAddressSid) itemSids.push(addressSid);

            // ── Supporting Document 2: Proof of Identity (file upload) ──
            // CRITICAL: File uploads MUST use numbers-upload.twilio.com, not numbers.twilio.com
            if (identityFile) {
                const idFormData = new FormData();
                idFormData.append('FriendlyName', 'Proof of Identity');
                // Use the regulation-derived type if available, otherwise fall back to frontend value
                const resolvedIdDocType = identityDocTypeFromReg || identityDocType || 'government_issued_id';
                console.log('Creating identity doc with type:', resolvedIdDocType);
                idFormData.append('Type', resolvedIdDocType);
                idFormData.append('Attributes', JSON.stringify({
                    first_name: firstName || '',
                    last_name: lastName || '',
                }));
                const idFileBytes = base64ToBytes(identityFile);
                const idBlob = new Blob([idFileBytes], { type: identityFileMime || 'application/octet-stream' });
                idFormData.append('File', idBlob, identityFileName || 'identity_proof');

                console.log('Uploading identity doc to numbers-upload.twilio.com...');
                const idDocRes = await fetch(`${numbersUploadBase}/SupportingDocuments`, {
                    method: 'POST',
                    headers: { 'Authorization': numbersAuth['Authorization'] },
                    body: idFormData,
                });
                const idDocData = await idDocRes.json();
                console.log('Identity doc response:', JSON.stringify(idDocData));
                if (!idDocRes.ok || !idDocData.sid) {
                    console.error('Identity doc upload error:', idDocData);
                    return jsonResponse({ error: idDocData.message || 'Failed to upload proof of identity. Please try again.' }, 400);
                }
                itemSids.push(idDocData.sid);
            }

            // ── Supporting Document 3: Proof of Address (file upload) ──
            // Only upload if the regulation requires a file-based address proof
            // SAFEGUARD: Never upload two docs of the same type — Twilio will reject
            let finalAddrDocType = addressProofDocTypeFromReg;
            const resolvedIdType = identityDocTypeFromReg || identityDocType || 'government_issued_id';
            if (finalAddrDocType && finalAddrDocType === resolvedIdType) {
                console.log(`Address proof type '${finalAddrDocType}' duplicates identity doc — finding alternative...`);
                // Re-scan the regulation for an alternative address type
                for (const reqGroup of supportingDocReqs) {
                    const group = Array.isArray(reqGroup) ? reqGroup : [reqGroup];
                    for (const req of group) {
                        const rn = (req.name || '').toLowerCase();
                        const rrn = (req.requirement_name || '').toLowerCase();
                        if (rn.includes('address') || rrn.includes('address')) {
                            const alt = (req.accepted_documents || []).find((a: any) => a.type !== resolvedIdType);
                            if (alt) {
                                finalAddrDocType = alt.type;
                                console.log(`Using alternative address type: ${finalAddrDocType}`);
                            }
                        }
                    }
                }
                // If still duplicate after scanning, skip the address proof upload
                if (finalAddrDocType === resolvedIdType) {
                    console.log('No alternative address type found — skipping address proof upload to prevent duplicate');
                    finalAddrDocType = '';
                }
            }
            if (addressProofFile && finalAddrDocType) {
                const addrProofFormData = new FormData();
                addrProofFormData.append('FriendlyName', 'Proof of Address');
                console.log('Creating address proof doc with type:', finalAddrDocType);
                addrProofFormData.append('Type', finalAddrDocType);
                addrProofFormData.append('Attributes', JSON.stringify({
                    address_sids: [addressSid],
                }));
                const addrFileBytes = base64ToBytes(addressProofFile);
                const addrBlob = new Blob([addrFileBytes], { type: addressProofFileMime || 'application/octet-stream' });
                addrProofFormData.append('File', addrBlob, addressProofFileName || 'address_proof');

                console.log('Uploading address proof doc to numbers-upload.twilio.com...');
                const addrProofDocRes = await fetch(`${numbersUploadBase}/SupportingDocuments`, {
                    method: 'POST',
                    headers: { 'Authorization': numbersAuth['Authorization'] },
                    body: addrProofFormData,
                });
                const addrProofDocData = await addrProofDocRes.json();
                console.log('Address proof doc response:', JSON.stringify(addrProofDocData));
                if (!addrProofDocRes.ok || !addrProofDocData.sid) {
                    console.error('Address proof doc upload error:', addrProofDocData);
                    return jsonResponse({ error: addrProofDocData.message || 'Failed to upload proof of address. Please try again.' }, 400);
                }
                itemSids.push(addrProofDocData.sid);
            } else if (addressProofFile && !finalAddrDocType) {
                console.log('Skipping address proof file upload — no valid non-duplicate type available.');
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

            // Submit for review by updating bundle status to pending-review
            // Per Twilio docs: POST to /Bundles/{Sid} with Status=pending-review
            console.log(`Submitting bundle ${bundleSid} for review with ${itemSids.length} assigned items...`);
            const submitRes = await fetch(`${numbersApiBase}/Bundles/${bundleSid}`, {
                method: 'POST',
                headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ Status: 'pending-review' }).toString(),
            });
            const submitData = await submitRes.json();
            console.log('Bundle submission response:', JSON.stringify(submitData));

            if (!submitRes.ok) {
                console.error('Bundle submission failed:', submitData);
                
                // Try to fetch evaluation details for a better error message
                let failureDetails = '';
                if (submitData.message && submitData.message.includes('Evaluations/')) {
                    try {
                        const evalMatch = submitData.message.match(/(https:\/\/numbers\.twilio\.com\/v2\/RegulatoryCompliance\/Bundles\/[^\s]+)/);
                        if (evalMatch) {
                            const evalRes = await fetch(evalMatch[1], { headers: numbersAuth });
                            if (evalRes.ok) {
                                const evalData = await evalRes.json();
                                console.log('Evaluation details:', JSON.stringify(evalData));
                                const results = evalData.results || [];
                                const failures = results.filter((r: any) => r.passed === false || r.status === 'noncompliant');
                                if (failures.length > 0) {
                                    failureDetails = failures.map((f: any) => 
                                        `${f.requirement_friendly_name || f.requirement_name || 'Requirement'}: ${f.failure_reason || 'Not met'}`
                                    ).join('; ');
                                }
                            }
                        }
                    } catch (evalErr) {
                        console.error('Failed to fetch evaluation details:', evalErr);
                    }
                }
                
                // Auto-cleanup the failed draft so it doesn't orphan in Twilio
                try {
                    console.log(`Cleaning up failed draft bundle ${bundleSid}...`);
                    await fetch(`${numbersApiBase}/Bundles/${bundleSid}`, { method: 'DELETE', headers: numbersAuth });
                    console.log('Draft bundle cleaned up successfully');
                } catch (cleanupErr) {
                    console.error('Failed to cleanup draft bundle:', cleanupErr);
                }
                
                const errorMsg = failureDetails 
                    ? `Bundle compliance check failed: ${failureDetails}` 
                    : (submitData.message || 'Failed to submit bundle for review. Please check all documents are uploaded correctly.');
                return jsonResponse({ error: errorMsg }, 400);
            }

            // Check final status
            const finalStatus = submitData.status;
            console.log('Bundle final status:', finalStatus);

            // Save the bundle SID to the database so status lookups use the exact bundle
            await supabase
                .from('business_profile')
                .update({ twilio_bundle_sid: bundleSid })
                .not('id', 'is', null); // updates all rows (single-row table)
            console.log('Saved bundle SID to business_profile:', bundleSid);

            if (finalStatus === 'twilio-approved') {
                return jsonResponse({ status: 'approved', message: 'Bundle approved! You can now purchase UK phone numbers.' });
            }

            return jsonResponse({
                pending: true,
                message: 'Your compliance bundle has been submitted for review. This typically takes 1-3 business days.',
                bundleSid: bundleSid,
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

                // Step 2: Create a fresh bundle (use admin email, never client email)
                const bundleRes = await fetch(`${numbersApiBase}/Bundles`, {
                    method: 'POST',
                    headers: { ...numbersAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        FriendlyName: 'Isobex Lasers UK Local Bundle',
                        Email: twilioNotificationEmail || '',
                        RegulationSid: regulationSid,
                        IsoCountry: 'GB',
                        NumberType: 'local',
                        StatusCallback: `${supabaseUrl}/functions/v1/bundle-status`,
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

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           DELETE BUNDLE
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (action === 'deleteBundle') {
            const numbersApiBase = 'https://numbers.twilio.com/v2/RegulatoryCompliance';
            const numbersAuth = { 'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`) };

            // Get the stored bundle SID
            const { data: bizProfile } = await supabase
                .from('business_profile')
                .select('id, twilio_bundle_sid')
                .limit(1)
                .single();

            if (!bizProfile?.twilio_bundle_sid) {
                return jsonResponse({ error: 'No bundle SID stored in database.' }, 400);
            }

            const bundleSid = bizProfile.twilio_bundle_sid;

            // Fetch current bundle status — can only delete draft, approved, or rejected
            const bundleRes = await fetch(
                `${numbersApiBase}/Bundles/${bundleSid}`,
                { headers: numbersAuth }
            );

            if (!bundleRes.ok) {
                // Bundle may already be deleted
                console.log('Bundle not found on Twilio — clearing local reference');
            } else {
                const bundleData = await bundleRes.json();
                const status = bundleData.status;
                console.log(`Bundle ${bundleSid} current status: ${status}`);

                if (status === 'pending-review' || status === 'in-review') {
                    return jsonResponse({
                        error: `Cannot delete a bundle that is ${status}. Wait for review to complete first.`
                    }, 400);
                }

                // Delete from Twilio
                const deleteRes = await fetch(`${numbersApiBase}/Bundles/${bundleSid}`, {
                    method: 'DELETE',
                    headers: numbersAuth,
                });

                if (!deleteRes.ok && deleteRes.status !== 404) {
                    const errData = await deleteRes.json().catch(() => ({}));
                    console.error('Twilio bundle delete error:', errData);
                    return jsonResponse({
                        error: errData.message || 'Failed to delete bundle from Twilio'
                    }, 400);
                }

                console.log(`Bundle ${bundleSid} deleted from Twilio`);
            }

            // Clear the stored bundle SID and cached status from business_profile
            await supabase
                .from('business_profile')
                .update({
                    twilio_bundle_sid: null,
                    twilio_bundle_status: null,
                    twilio_bundle_status_updated_at: null,
                    twilio_bundle_failure_reason: null,
                })
                .eq('id', bizProfile.id);

            console.log('Cleared bundle SID from business_profile');

            return jsonResponse({
                ok: true,
                message: `Bundle ${bundleSid} has been deleted. You can now create a new bundle.`,
            });
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CLEANUP DRAFT BUNDLES
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (action === 'cleanupDraftBundles') {
            const numbersApiBase = 'https://numbers.twilio.com/v2/RegulatoryCompliance';
            const numbersAuth = { 'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`) };

            const listRes = await fetch(`${numbersApiBase}/Bundles?Status=draft&PageSize=50`, {
                headers: numbersAuth,
            });
            const listData = await listRes.json();
            const drafts = listData.results || [];
            console.log(`Found ${drafts.length} draft bundles to clean up`);

            let deleted = 0;
            let failed = 0;
            for (const draft of drafts) {
                try {
                    const delRes = await fetch(`${numbersApiBase}/Bundles/${draft.sid}`, {
                        method: 'DELETE',
                        headers: numbersAuth,
                    });
                    if (delRes.ok || delRes.status === 404) {
                        deleted++;
                        console.log(`Deleted draft bundle ${draft.sid} (${draft.friendly_name})`);
                    } else {
                        failed++;
                    }
                } catch (err) {
                    failed++;
                }
            }

            return jsonResponse({
                ok: true,
                message: `Cleaned up ${deleted} draft bundles${failed > 0 ? ` (${failed} failed)` : ''}.`,
                deleted,
                failed,
                total: drafts.length,
            });
        }

        return jsonResponse({ error: `Unknown action: ${action}` }, 400);

    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('phone-numbers error:', errMsg, err);
        return jsonResponse({ error: errMsg || 'Internal server error' }, 500);
    }
});
