#!/usr/bin/env python
"""
Simple python client for secure programmatic access to QED via API Keys

Requires:
 - Python Dependencies:
    - [sudo] easy_install --upgrade google-api-python-client
        https://developers.google.com/api-client-library/python/start/installation
    - [sudo] easy_install --upgrade PyCrypto
    - [sudo] easy_install --upgrade PyOpenSSL

 - OAUTH2 credentials from http://code.google.com/apis/console
    1. Create Project
    2. Under API Access, Create an OAuth 2.0 client ID...
        - Select Application Type: Service account
        - Create client ID
    3. Download Public/Private Key
    4. Download JSON (client_secrets.json)

 - Downloaded "client_secrets.json" in current working directory
 - Downloaded "<private-key>.key" in current working directory

Operations:
 - python qed_oauth2 GET QED_URI a=1 b=true c="VALUE" d="{'JSON'}" e=["ARRAY"]
 - python qed_oauth2 POST QED_URI a=1 b=true c="VALUE" d="{'JSON'}" e=["ARRAY"]

"""

from oauth2client.client import SignedJwtAssertionCredentials
import httplib2
from urllib import urlencode
import json

def oauth():
    # Console when you created your Service account.
    f = file('privatekey.p12', 'rb')
    key = f.read()
    f.close()

    # Create an httplib2.Http object to handle our HTTP requests and authorize it
    # with the Credentials. Note that the first parameter, service_account_name,
    # is the Email address created for the Service account. It must be the email
    # address associated with the key that was created.
    scope = "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
    credentials = SignedJwtAssertionCredentials('...@developer.gserviceaccount.com', key, scope=scope)
    # TODO : append "prn" to see if this will give the correct email address
    http = httplib2.Http()

    data = {"grant_type":"urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": credentials._generate_assertion()}
    head = {"Content-Type": "application/x-www-form-urlencoded"}
    resp, content = http.request("https://accounts.google.com/o/oauth2/token", "POST", urlencode(data), headers=head)
    access_token = json.loads(content)["access_token"]

    resp, content = http.request("http://localhost:8000/auth/signin/google/oauth2_client?access_token=%s"%access_token, "GET")
    print "resp=%s" % resp
    print "content=%s" % content

if __name__ == "__main__":
    oauth()

