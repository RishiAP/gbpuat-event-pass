import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface FileUploadModalSlice {
  value: {event_id:string|null,status:boolean},
}

const initialState: FileUploadModalSlice = {
  value: {event_id:null,status:false},
}

export const fileUploadModalSlice = createSlice({
  name: 'fileUploadModal',
  initialState,
  reducers: {
    setFileUploadModalStatus:(state,action:PayloadAction<boolean>)=>{
        state.value.status = action.payload;
    },
    setFileUploadModalEventID:(state,action:PayloadAction<string>)=>{
        state.value.event_id=action.payload
    }
  },
})

// Action creators are generated for each case reducer function
export const { setFileUploadModalStatus,setFileUploadModalEventID } = fileUploadModalSlice.actions

export default fileUploadModalSlice.reducer