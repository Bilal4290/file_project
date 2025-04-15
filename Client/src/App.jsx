import React, { useState, useEffect } from 'react'
import { VscFileSymlinkDirectory } from "react-icons/vsc";
import { MdOutlineFileUpload } from "react-icons/md";
import { PiDotsThreeOutlineVerticalFill } from "react-icons/pi";
import ContextMenu from './components/ContextMenu';
import Modal from './components/Modal';


    


const App = () => {


    const SERVER_URL='http://192.168.100.17:8000/';
    
    // useState Hooks
    const [dirData,setDirData] = useState([])
    const [activeMenuIndex, setActiveMenuIndex] = useState(null);
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [itemToRename, setItemToRename] = useState('')
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createValue, setCreateValue] = useState('');
    const [progress,setProgress] = useState(0)


    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadXHR, setUploadXHR] = useState(null);
    const [uploads, setUploads] = useState([]);

    const [selectedItems, setSelectedItems] = useState([]);






    // Function fetching directories data
    async function getDirData(){
        const response = await fetch(SERVER_URL)
        const data = await response.json()
        setDirData(data);
    }

    // useEffect Hooks
    useEffect(() => {
        getDirData()
    }, [])


    useEffect(() => {
      return () => {
        // Cleanup function
        if (uploadXHR) {
          uploadXHR.abort();
        }
      };
    }, [uploadXHR]);

    useEffect(() => {
      const timeout = setTimeout(() => {
        setUploads(prev => prev.filter(u => u.status === 'uploading'));
      }, 5000);
    
      return () => clearTimeout(timeout);
    }, [uploads]);
    

    useEffect(() => {
      if (uploads.length > 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, [uploads]);
    

    // Handle PopUP Menu Function
    function handlePopUp(index){
      setActiveMenuIndex(prev => prev === index ? null : index);
    }


    // Handle Close Menu Function
    const handleCloseMenu = () => {
      setActiveMenuIndex(null);
    }


     function openRenameModel(oldName){
            setRenameModalOpen(true)
            setItemToRename(oldName)  
    }

    // Handle Save Rename Function
    async function handleSaveRename(){
          setRenameModalOpen(false)
          const response = await fetch(SERVER_URL,{
            method: 'PATCH',
            headers: {
                  'Content-Type': 'application/json'
            },
            body: JSON.stringify({oldName: itemToRename, newName: renameValue})
            })
            const data = await response.json()
            console.log(data);
            getDirData()
            setRenameValue('')

    }


    function handleCreate(){
          setCreateModalOpen(false)
    }

    // Handle File Upload Function



function handleFileUpload(e) {
      const files = e.target.files;
      if (!files || files.length === 0) return;
    
      const newUploads = Array.from(files).map(file => ({
        file,
        progress: 0,
        status: 'uploading',
      }));
    
      setUploads(prev => [...prev, ...newUploads]);
    
      const uploadNextFile = (index) => {
        if (index >= files.length) {
          setIsUploading(false);
          setUploadXHR(null);
          setUploadSuccess(true);
          getDirData();
          setTimeout(() => setUploadSuccess(false), 2000);
          return;
        }
    
        const file = files[index];
        const xhr = new XMLHttpRequest();
        setUploadXHR(xhr);
    
        xhr.open('POST', SERVER_URL, true);
        xhr.setRequestHeader('filename', file.name);
    
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploads(prev =>
              prev.map(upload =>
                upload.file.name === file.name
                  ? { ...upload, progress: percent }
                  : upload
              )
            );
          }
        });
    
        xhr.addEventListener('load', () => {
          const status = xhr.status >= 200 && xhr.status < 300 ? 'success' : 'error';
    
          setUploads(prev =>
            prev.map(upload =>
              upload.file.name === file.name
                ? { ...upload, progress: 100, status }
                : upload
            )
          );
    
          if (status === 'success') {
            uploadNextFile(index + 1);
          } else {
            setUploadError(`Upload failed for ${file.name}`);
            setTimeout(() => setUploadError(null), 3000);
            setIsUploading(false);
          }
        });
    
        xhr.addEventListener('error', () => {
          setUploads(prev =>
            prev.map(upload =>
              upload.file.name === file.name
                ? { ...upload, status: 'error' }
                : upload
            )
          );
          setUploadError(`Network error during upload of ${file.name}`);
          setIsUploading(false);
        });
    
        xhr.addEventListener('abort', () => {
          setUploads(prev =>
            prev.map(upload =>
              upload.file.name === file.name
                ? { ...upload, status: 'error' }
                : upload
            )
          );
          setUploadError(`Upload cancelled for ${file.name}`);
          setTimeout(() => setUploadError(null), 2000);
          setIsUploading(false);
        });
    
        const formData = new FormData();
        formData.append('file', file);
        xhr.send(formData);
      };
    
      setIsUploading(true);
      setUploadProgress(0);
      setUploadSuccess(false);
      setUploadError(null);
      uploadNextFile(0);
    }
    
    

     async function handleDelete(deleteName){

      if (!window.confirm(`Are you sure you want to permanently delete "${deleteName}"?`)) {
            return;
        }

         const response = await fetch(SERVER_URL,{
            method: 'DELETE',
            headers: {
                  'Content-Type': 'application/json'
              },
            body: JSON.stringify({deleteName})
         })
         const data = await response.json()
         console.log(data);

         if (response.ok) {
            getDirData(); // Refresh the file list
            setActiveMenuIndex(null);

        } else {
            alert(data.error || 'Failed to delete file');
        }

     }


     async function handleCreate(){

            if (!createValue.trim()) {
                  alert('Please enter a folder name');
                  return;
            }

           const response = await fetch(`${SERVER_URL}create-folder`,{
                  method: 'POST',
                  headers: {
                        'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({folderName: createValue})
           })
           const data = await response.json()

           if (response.ok) {
                  setCreateModalOpen(false);
                  setCreateValue('');
                  getDirData();
                  console.log(data);
            } else {
                  alert(result.error || 'Failed to create folder');
            }

     }


     const handleCancelUpload = () => {
      if (uploadXHR) {
        uploadXHR.abort(); // This will trigger the onabort event
        setUploadXHR(null);         // Reset XHR
        setProgress(0);             // Reset progress bar
      }
    };




    // Make sure these exist: uploads and dirData
      const uploadingFiles = uploads
      .filter(upload => !dirData.includes(upload.file.name))
      .map(upload => upload.file.name);

      // Combine uploading files at the top + already uploaded files
      const combinedItems = [...uploadingFiles, ...dirData.filter(item => !uploadingFiles.includes(item))];


      const handleSelectItem = (item) => {
            setSelectedItems(prev => 
              prev.includes(item)
                ? prev.filter(i => i !== item)
                : [...prev, item]
            );
          };
          


      const handleDeleteSelected = async () => {
            if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} item(s)?`)) {
              return;
            }
          
            try {
              const response = await fetch(`${SERVER_URL}bulk-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: selectedItems }),
              });
          
              const data = await response.json();
              console.log(data);
          
              if (response.ok) {
                setSelectedItems([]);
                getDirData();
              } else {
                alert(data.error || 'Failed to delete selected files.');
              }
            } catch (err) {
              alert('Error deleting files');
            }
          };
          



  return (

  //  Main Div
   <div className='max-w-[1440px] w-full mx-auto pt-7 px-5'>

        {/* Div conatining folder name and upload create buttons */}
        <div className='flex justify-between items-center mb-5'>
             {/* Current Folder Name Heading */}
             <h1 className='font-bold text-3xl text-blue-600'>My Drive</h1>


             {/* Div containing create folders and upload files button */}
             <div className='flex'>
                  <button  
                         onClick={() => setCreateModalOpen(true)} 
                         className='w-[40px] h-[40px] text-[27px] text-white bg-blue-500 mx-2 rounded-full flex items-center justify-center'>
                        <VscFileSymlinkDirectory />
                  </button>
                 

                  <div className='flex items-center'>
                        <label 
                        className={`w-[40px] h-[40px] flex items-center justify-center text-3xl text-white mx-2 rounded-full cursor-pointer relative overflow-hidden ${
                              isUploading ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                        >
                        <MdOutlineFileUpload />
                        <input 
                              type="file" 
                              onChange={handleFileUpload}
                              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                              disabled={isUploading}
                              multiple                    
                        />
                        </label>
                  
                        {isUploading && (
                        <button 
                              className="text-red-500 text-sm ml-2"
                              onClick={handleCancelUpload}
                        >
                              Cancel
                        </button>
                        )}
                  </div>
             </div>
        </div>



        {/* Horizontal Line used for sepration */}
        <div className='h-1 w-full bg-gray-400 mb-8'></div>



      {/* Div Showing Success and Error Status */}
      <div className="my-4">

            {/* {isUploading && (
                  <div className="w-full h-2.5 bg-gray-200 rounded-full  mb-4">
                        <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                        ></div>
                        <div className="text-md text-gray-600 mt-1">
                        Uploading: {uploadProgress}%
                        </div>
                  </div>
            )} */}

            {uploadSuccess && (
                  <div className="text-green-600 text-lg font-medium mb-2">
                        File uploaded successfully!
                  </div>
            )}

            {uploadError && (
                  <div className="text-red-600 text-lg font-medium mb-2">
                        Error: {uploadError}
                  </div>
            )}
      </div>


      {selectedItems.length > 0 && (
            <div className="mb-4 flex justify-end">
            <button 
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                  onClick={handleDeleteSelected}
            >
                  Delete Selected ({selectedItems.length})
            </button>
            </div>
      )}



      {/* Files and Folders listing code */}
     
      {combinedItems.length === 0 ? (
            <div className="text-center text-blue-600 text-xl font-medium mt-10">
            No files or folders yet. Upload something to get started!
            </div>
         ) : ( combinedItems.map((item, i) => {
            const currentUpload = uploads.find(upload => upload.file.name === item);

            return (
                  <div key={i} className='px-5 py-2 my-5 bg-gray-200 flex justify-between items-center relative'>

                        {/* Show progress bar if uploading */}
                        {currentUpload && currentUpload.status !== 'success' ? (
                        <div className="w-full">
                        <div className="w-full bg-gray-300 h-2.5 rounded-full">
                              <div
                              className={`h-2.5 rounded-full transition-all duration-300 ${
                              currentUpload.status === 'error'
                                    ? 'bg-red-500'
                                    : 'bg-blue-600'
                              }`}
                              style={{ width: `${currentUpload.progress}%` }}
                              ></div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                              {currentUpload.status === 'uploading' && `Uploading: ${currentUpload.progress}%`}
                              {currentUpload.status === 'error' && `❌ Failed`}
                        </div>
                        </div>
                        ) : (
                        <>
                        {/* <div className='text-xl font-medium w-full'>
                              <a href={`${SERVER_URL}${item}?action=open`} >{item}</a>
                        </div> */}

                        <div className='flex items-center gap-3 w-full'>
                              <input 
                              type="checkbox" 
                              checked={selectedItems.includes(item)} 
                              onChange={() => handleSelectItem(item)}
                              />
                              <a href={`${SERVER_URL}${item}?action=open`} className='text-xl font-medium'>
                              {item}
                              </a>
                        </div>


                        <button className='text-xl' onClick={() => handlePopUp(i)}>
                              <PiDotsThreeOutlineVerticalFill />
                        </button>

                        {activeMenuIndex === i && (
                              <ContextMenu onClose={handleCloseMenu} className='w-[100px] flex flex-col absolute right-10 top-5 z-10'>
                                    <button onClick={() => openRenameModel(item)} className='px-2 py-1 hover:bg-gray-200'>Rename</button>
                                    <button onClick={() => handleDelete(item)} className='px-2 py-1 hover:bg-gray-200 border-t-2 border-black'>Delete</button>
                                    <a href={`${SERVER_URL}${item}?action=download`} className='px-2 py-1 hover:bg-gray-200 border-t-2 border-black'>Download</a>
                              </ContextMenu>
                        )}
                        </>
                        )}
                  </div>
            );
      }))}



        {/* Rename Modal */}
        <Modal isOpen={renameModalOpen} onClose={() => setRenameModalOpen(false)}>
              <h2 className='font-bold text-2xl mb-2'>Rename</h2>
              <input 
                    type="text" 
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className='border-2 border-black px-4 py-2 rounded w-full text-xl mb-4'
              />
              <div className='flex justify-end gap-2'>
                   <button
                           className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                           onClick={handleSaveRename}
                   >Save
                   </button>

                   <button
                            className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
                            onClick={() => setRenameModalOpen(false)}
                   >
                    Close
                   </button>
              </div>
        </Modal>


        {/* Create Modal */}
        <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)}>
              <h2 className='font-bold text-2xl mb-2'>Create</h2>
              <input 
                    type="text" 
                    value={createValue}
                    onChange={(e) => setCreateValue(e.target.value)}
                    className='border-2 border-black px-4 py-2 rounded w-full text-xl mb-4'
              />
              <div className='flex justify-end gap-2'>
                   <button
                           className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                           onClick={handleCreate}
                   >Create
                   </button>

                   <button
                            className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
                            onClick={() => setCreateModalOpen(false)}
                   >
                    Close
                   </button>
              </div>
        </Modal>
   </div>
   

  )
}

export default App












