UHLL OVERVIEW
UHLL is a protocol that was developed specifically for the hospitality industry. It’s an expandable message-based language that enables UHLL compliant property management and guest service systems to interface with Lodging Link through one simple, well-defined interface. It entirely eliminates the need for a PMS or GSS to write individual software interfaces for every device that is connected.

UHLL MESSAGING STRUCTURE
The following sections describe the individual components that make up a UHLL message.

Message Types and Data Field Ids
Every Message Type is designated as inbound, outbound or two-way. Any Data Field Ids (DFIDs) associated with the Message Types that are used for two-way communication also have direction qualifiers.

UHLL Message Layout
The following sections describe the raw format of a UHLL message.

UHLL Header Composition

Each message starts with a UHLL Header. The header is broken down as follows:

MMDDDRRTTTTSSSS

·         Message Type (MM) - Two character Message Type descriptor.

·         DMM (DDD) - Three character Device / Manufacturer / Model identification string that uniquely identifies the device that sent this message.

·         RESERVED (RR) - These two characters are reserved for future use and should always be set to 00 (two zeros).

·         Transaction ID (TTTT) - A 4-digit "auto-increment" number that signifies a single Transaction Request / Response. The counter runs from 0001 to 9999 and wraps back to 0001. This is used to coordinate request / response messaging.  When sending or receiving a solicited response, the transaction ID must match the transaction ID of the inquiry. 

·         Sequence Number (SSSS) - 4-digit number that organizes the individual message(s) that comprise a single Transaction Request. The sequence numbers should start at 0001 and increment by one. The last message in a Transaction Request should contain the special sequence number 9999.

Message Element Triplet

Following the header, there can be zero or more of the following message element triplets:

DDDLLLX..X

·         DFID (DDD) - 3-digit descriptor for the type of data this one message element represents.

·         Length (LLL) - 3-digit descriptor for the length of the data that this element represents.

·         Data (X..X) - The data itself with a total length of LLL bytes.

Example

The following is a sample "Maid Code" message - Message Type 17, containing DFIDs 144 and 174. This Transaction would represent a message from a device with a DMM of 353 to report that station number 102 has been cleaned. Please see the online UHLL specification for more information.

1735300000199991440011174003102