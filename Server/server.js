import { createWriteStream } from 'fs';
import { mkdir, open, readdir, rename, rm, rmdir, unlink } from 'fs/promises';
import http from 'http';
import mime from 'mime-types'

const server = http.createServer(async (req,res) => {

    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Headers", "*")
    res.setHeader("Access-Control-Allow-Methods", "*")

    if(req.method === 'GET'){
        if(req.url === '/'){
            const filesList = await readdir('./Storage')

             // Filter out empty files
            // const filteredFiles = [];

            // for (const file of filesList) {
            //     const fileStats = await fs.promises.stat(`./Storage/${file}`);
            //     if (fileStats.isDirectory() || fileStats.size > 0) {
            //         filteredFiles.push(file);
            //     }
            // }

            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify(filesList))
      }else{
            try {
                  const [filePath,queryParams] = req.url.split('?')
                  const params = {}
                  queryParams?.split('&').forEach((pair) => { 
                                                              const [key,value] = pair.split('=') 
                                                              params[key] = value
                                                            })
  
                  const fileHandle = await open(`./Storage${decodeURIComponent(filePath)}`)
                  
                  const stats = await fileHandle.stat()
  
                  if(stats.isDirectory()){
                          const filesList = await readdir(`./Storage${decodeURIComponent(filePath)}`)
                          res.setHeader("Content-Type", "application/json")
                          res.end(JSON.stringify(filesList))
                          await fileHandle.close();
                  }else{
                          const readStream = fileHandle.createReadStream()
                          res.setHeader("Content-Type",mime.contentType(filePath.slice(1)))
                          res.setHeader("Content-Length",stats.size)
                          if(params.action === 'download'){
                              res.setHeader("Content-Disposition", `attachment; filename="${filePath.slice(1)}"`);
                          }
                          readStream.pipe(res)
  
                          
                          readStream.on('close', async () => {
                              await fileHandle.close(); 
                          });
  
                          readStream.on('error', async (err) => {
                              await fileHandle.close();
                              res.writeHead(500);
                              res.end('Stream Error');
                          });
                  }    
                  
            } catch (error) {
                  res.end('Not Found')
            }
      }
    }else if(req.method === 'OPTIONS'){
       res.end('OK')
    }else if(req.method === 'POST'){
        if(req.url === '/'){
            const writeStream = createWriteStream(`./Storage/${req.headers.filename}`)
            req.pipe(writeStream)

            req.on('end',() => {
                res.end('File successfully uploaded on the server.')
            })

            req.on('aborted', async () => {
                req.unpipe(writeStream); 
                writeStream.destroy();
        
                try {
                    await rm(`./Storage/${req.headers.filename}`,{recursive: true});
                    console.log('Partially uploaded file removed');
                } catch (err) {
                    console.error('Failed to delete aborted file:', err.message);
                }
            });

             // Catch writeStream errors
        writeStream.on('error', (err) => {
            console.error('WriteStream error:', err.message);
            // Avoid crashing the process
            if (!res.writableEnded) {
                res.writeHead(500);
                res.end('Internal Server Error');
            }
        });

        // Also catch req stream errors (important!)
        req.on('error', (err) => {
            console.error('Request stream error:', err.message);
            writeStream.destroy();
        });
        }
        
        if(req.url === '/create-folder'){
            let body = '';
            req.on('data',(chunk) => {
                body += chunk.toString()
            })

            req.on('end', async () => {
                const { folderName } = JSON.parse(body);

                if (!folderName) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: 'folderName is required' }));
                }

                try {
                    // Create the folder
                    await mkdir(`./Storage/${folderName}`);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ 
                        error: 'Failed to create folder',
                        details: error.message 
                    }));
                }
            })
        }

        if (req.url === '/bulk-delete') {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk.toString();
            });
        
            req.on('end', async () => {
                try {
                    const { items } = JSON.parse(body);
        
                    if (!Array.isArray(items) || items.length === 0) {
                        res.statusCode = 400;
                        return res.end(JSON.stringify({ error: 'items must be a non-empty array' }));
                    }
        
                    const results = [];
        
                    for (const item of items) {
                        try {
                            await rm(`./Storage/${item}`, { recursive: true });
                            results.push({ item, success: true });
                        } catch (err) {
                            results.push({ item, success: false, error: err.message });
                        }
                    }
        
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, results }));
        
                } catch (err) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'Failed to process bulk delete', details: err.message }));
                }
            });
        }
        
    }else if(req.method === 'PATCH'){
         let body = '';
         req.on('data',(chunk) => {
            body += chunk.toString()
         })
         req.on('end', async () => {
            const {oldName, newName} = JSON.parse(body);

            if(!oldName || !newName){
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Both oldName and newName are required' }))
            }

            try {
                await rename(`./Storage/${oldName}`, `./Storage/${newName}`);
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to rename file' }));
            }
         })
    }else if(req.method === 'DELETE'){
        let body='';
        req.on('data',(chunk) => {
            body += chunk.toString()
        })

        req.on('end',async() => {
            const {deleteName} = JSON.parse(body)
            console.log(deleteName);

            if (!deleteName) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'deleteName is required' }));
            }

            try {
                // Delete the file
                await rm(`./Storage/${deleteName}`,{recursive: true});
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to delete file' }));
            }
        })
    }

})

server.listen(8000,() => {
    console.log('Server Started!!');
})