import mongoose,{Schema} from "mongoose";

const SubscriptionSchema = new Schema(
    {
        //Subscriber
        subscriber:{
            type:Schema.Types.ObjectId,
            ref:"User"
        },

        //channel - one whom we are subscribed to
        channel:{
            type:Schema.Types.ObjectId,
            ref:"User"
        }
    },
    {timestamps:true})


export const Subscription = mongoose.model("Subscription",SubscriptionSchema)