const textarea = document.getElementById("summary");
export default function updateCounter(){
  const counter = document.getElementById("summaryCounter");
  
  const length = textarea.value.length;
  counter.textContent = length + " / 250";

  counter.classList.remove("warning","limit");

  if(length > 200){
    counter.classList.add("warning");
  }

  if(length === 250){
    counter.classList.add("limit");
  }
}
